-- ERP Business demo: esquema completo (schema-only, sin datos). Cargar ANTES de db/seed.sql.
-- Generado con pg_dump --schema-only --no-owner --no-privileges. Requiere PostgreSQL 16+.

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6 (6569466)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: calcular_igtf(numeric, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_igtf(p_monto numeric, p_forma_pago character varying) RETURNS numeric
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_tasa NUMERIC;
BEGIN
    IF p_forma_pago NOT IN ('DIVISA_USD', 'DIVISA_EUR', 'CRIPTO', 'ZELLE') THEN
        RETURN 0.00;
    END IF;

    SELECT porcentaje INTO v_tasa
    FROM parametros_fiscales
    WHERE codigo = 'IGTF'
      AND activo = TRUE
      AND vigente_desde <= CURRENT_DATE
      AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
    ORDER BY vigente_desde DESC
    LIMIT 1;

    IF v_tasa IS NULL THEN RETURN 0.00; END IF;

    RETURN ROUND(p_monto * v_tasa / 100.0, 2);
END;
$$;


--
-- Name: calcular_retencion_iva_ce(numeric, boolean, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_retencion_iva_ce(p_monto_iva numeric, p_aplica boolean, p_porcentaje numeric DEFAULT NULL::numeric) RETURNS TABLE(monto_retencion numeric, monto_iva_cobrado numeric, porcentaje_aplicado numeric)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_pct NUMERIC(5, 2);
BEGIN
    IF NOT COALESCE(p_aplica, FALSE) OR COALESCE(p_monto_iva, 0) <= 0 THEN
        monto_retencion := 0.00;
        monto_iva_cobrado := ROUND(COALESCE(p_monto_iva, 0), 2);
        porcentaje_aplicado := 0.00;
        RETURN NEXT;
        RETURN;
    END IF;

    IF p_porcentaje IS NOT NULL THEN
        v_pct := p_porcentaje;
    ELSE
        SELECT porcentaje INTO v_pct
        FROM parametros_fiscales
        WHERE codigo = 'RETENCION_IVA_CE'
          AND activo = TRUE
          AND vigente_desde <= CURRENT_DATE
          AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
        ORDER BY vigente_desde DESC
        LIMIT 1;
        v_pct := COALESCE(v_pct, 75.00);
    END IF;

    monto_retencion := ROUND(p_monto_iva * v_pct / 100.0, 2);
    monto_iva_cobrado := ROUND(p_monto_iva - monto_retencion, 2);
    porcentaje_aplicado := v_pct;
    RETURN NEXT;
END;
$$;


--
-- Name: fn_actualizar_costo_producto_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_actualizar_costo_producto_cache() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.activo = true THEN
        -- Desactivar los costos anteriores para el mismo producto
        UPDATE producto_costos 
        SET activo = false 
        WHERE producto_id = NEW.producto_id AND id <> NEW.id;

        -- Actualizar el caché en la tabla productos principal
        UPDATE productos 
        SET precio_costo = NEW.costo 
        WHERE id = NEW.producto_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: fn_actualizar_precio_producto_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_actualizar_precio_producto_cache() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.activo = true THEN
        -- Desactivar precios anteriores para el MISMO producto y MISMO nivel
        UPDATE producto_precios 
        SET activo = false 
        WHERE producto_id = NEW.producto_id 
          AND nivel_precio_id = NEW.nivel_precio_id 
          AND id <> NEW.id;

        -- Actualizar el precio de venta cacheado (Solo si es el nivel base, que usualmente es el 1)
        -- Ajustar el ID del nivel si el nivel base de "Venta al Público" es otro
        IF NEW.nivel_precio_id = 1 THEN
            UPDATE productos 
            SET precio_venta = NEW.precio,
                moneda_venta_id = NEW.moneda_id
            WHERE id = NEW.producto_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: fn_trg_compra_actualizar_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trg_compra_actualizar_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM inventario_stock 
        WHERE producto_id = NEW.producto_id 
          AND deposito_id = NEW.deposito_id 
          AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL))
    ) THEN
        UPDATE inventario_stock
        SET existencia = existencia + NEW.cantidad
        WHERE producto_id = NEW.producto_id 
          AND deposito_id = NEW.deposito_id 
          AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL));
    ELSE
        INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia)
        VALUES (NEW.producto_id, NEW.deposito_id, NEW.lote_id, NEW.cantidad);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: fn_trg_devolucion_venta_actualizar_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trg_devolucion_venta_actualizar_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Comprobar si ya existe el registro de stock en el almacén
    IF EXISTS (
        SELECT 1 FROM inventario_stock 
        WHERE producto_id = NEW.producto_id 
          AND deposito_id = NEW.deposito_id 
          AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL))
    ) THEN
        UPDATE inventario_stock
        SET existencia = existencia + NEW.cantidad
        WHERE producto_id = NEW.producto_id 
          AND deposito_id = NEW.deposito_id 
          AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL));
    ELSE
        INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia)
        VALUES (NEW.producto_id, NEW.deposito_id, NEW.lote_id, NEW.cantidad);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: fn_trg_factura_anulada_restaurar_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trg_factura_anulada_restaurar_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_detalle RECORD;
BEGIN
    -- Solo actuar cuando pasa de otro estado a 'ANULADA'
    IF NEW.status = 'ANULADA' AND OLD.status <> 'ANULADA' THEN
        FOR v_detalle IN (
            SELECT producto_id, deposito_id, lote_id, cantidad 
            FROM factura_venta_detalles 
            WHERE factura_id = NEW.id
        ) LOOP
            -- Actualizar stock incrementándolo
            UPDATE inventario_stock
            SET existencia = existencia + v_detalle.cantidad
            WHERE producto_id = v_detalle.producto_id
              AND deposito_id = v_detalle.deposito_id
              AND (lote_id = v_detalle.lote_id OR (lote_id IS NULL AND v_detalle.lote_id IS NULL));
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: fn_trg_movimientos_inventario_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trg_movimientos_inventario_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tipo VARCHAR(20);
    v_dep_origen INT;
    v_dep_destino INT;
    v_stock_id INT;
BEGIN
    -- Obtener información de la cabecera
    SELECT tipo_movimiento, deposito_origen_id, deposito_destino_id
    INTO v_tipo, v_dep_origen, v_dep_destino
    FROM inventario_movimientos
    WHERE id = NEW.movimiento_id;

    IF v_tipo = 'CARGO' THEN
        -- Incrementar en depósito origen (que actúa como destino de la mercancía)
        IF EXISTS (
            SELECT 1 FROM inventario_stock 
            WHERE producto_id = NEW.producto_id AND deposito_id = v_dep_origen
              AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL))
        ) THEN
            UPDATE inventario_stock
            SET existencia = existencia + NEW.cantidad
            WHERE producto_id = NEW.producto_id AND deposito_id = v_dep_origen
              AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL));
        ELSE
            INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia)
            VALUES (NEW.producto_id, v_dep_origen, NEW.lote_id, NEW.cantidad);
        END IF;

    ELSIF v_tipo = 'DESCARGO' THEN
        -- Restar del depósito origen (permite quedar en negativo)
        SELECT id INTO v_stock_id
        FROM inventario_stock
        WHERE producto_id = NEW.producto_id AND deposito_id = v_dep_origen
          AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL))
        FOR UPDATE;

        IF v_stock_id IS NULL THEN
            INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia, reservado)
            VALUES (NEW.producto_id, v_dep_origen, NEW.lote_id, -NEW.cantidad, 0.00);
        ELSE
            UPDATE inventario_stock
            SET existencia = existencia - NEW.cantidad
            WHERE id = v_stock_id;
        END IF;

    ELSIF v_tipo = 'TRANSFERENCIA' THEN
        -- 1. Restar del depósito origen (permite quedar en negativo)
        SELECT id INTO v_stock_id
        FROM inventario_stock
        WHERE producto_id = NEW.producto_id AND deposito_id = v_dep_origen
          AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL))
        FOR UPDATE;

        IF v_stock_id IS NULL THEN
            INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia, reservado)
            VALUES (NEW.producto_id, v_dep_origen, NEW.lote_id, -NEW.cantidad, 0.00);
        ELSE
            UPDATE inventario_stock
            SET existencia = existencia - NEW.cantidad
            WHERE id = v_stock_id;
        END IF;

        -- 2. Sumar en depósito de destino
        IF EXISTS (
            SELECT 1 FROM inventario_stock 
            WHERE producto_id = NEW.producto_id AND deposito_id = v_dep_destino
              AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL))
        ) THEN
            UPDATE inventario_stock
            SET existencia = existencia + NEW.cantidad
            WHERE producto_id = NEW.producto_id AND deposito_id = v_dep_destino
              AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL));
        ELSE
            INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia)
            VALUES (NEW.producto_id, v_dep_destino, NEW.lote_id, NEW.cantidad);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: fn_trg_recibo_aplicar_cobro(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trg_recibo_aplicar_cobro() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 1. Restar el monto aplicado del documento de cuentas por cobrar
    UPDATE cuentas_cobrar
    SET saldo_pendiente = saldo_pendiente - NEW.monto_aplicado,
        status = CASE WHEN (saldo_pendiente - NEW.monto_aplicado) <= 0 THEN 'PAGADO' ELSE 'PENDIENTE' END
    WHERE id = NEW.cxc_id;

    RETURN NEW;
END;
$$;


--
-- Name: fn_trg_venta_actualizar_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trg_venta_actualizar_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_stock_id INT;
BEGIN
    SELECT id INTO v_stock_id
    FROM inventario_stock
    WHERE producto_id = NEW.producto_id
      AND deposito_id = NEW.deposito_id
      AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL))
    FOR UPDATE;

    IF v_stock_id IS NULL THEN
        INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia, reservado)
        VALUES (NEW.producto_id, NEW.deposito_id, NEW.lote_id, -NEW.cantidad, 0.00);
    ELSE
        UPDATE inventario_stock
        SET existencia = existencia - NEW.cantidad
        WHERE id = v_stock_id;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: generar_cxc_desde_devolucion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_cxc_desde_devolucion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO cuentas_cobrar (
        cliente_id, tipo_documento, numero_documento, devolucion_id, 
        fecha_emision, fecha_vencimiento, monto_original, saldo_pendiente, 
        moneda_id, tasa_cambio, status
    )
    VALUES (
        NEW.cliente_id, 'DEVOLUCION', NEW.numero_devolucion, NEW.id,
        NEW.fecha_devolucion, NEW.fecha_devolucion, 
        NEW.total_neto, NEW.total_neto,
        NEW.moneda_id, NEW.tasa_cambio, 'PENDIENTE'
    );
    RETURN NEW;
END;
$$;


--
-- Name: generar_cxc_desde_factura(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_cxc_desde_factura() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO cuentas_cobrar (
        cliente_id, tipo_documento, numero_documento, factura_id, 
        fecha_emision, fecha_vencimiento, monto_original, saldo_pendiente, 
        moneda_id, tasa_cambio, status
    )
    VALUES (
        NEW.cliente_id, 'FACTURA', NEW.numero_factura, NEW.id,
        NEW.fecha_emision, NEW.fecha_vencimiento, NEW.total_neto, NEW.total_neto,
        NEW.moneda_id, NEW.tasa_cambio, 'PENDIENTE'
    );
    RETURN NEW;
END;
$$;


--
-- Name: procesar_inventario_devolucion_venta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.procesar_inventario_devolucion_venta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE inventario_stock
    SET existencia = existencia + NEW.cantidad
    WHERE producto_id = NEW.producto_id 
      AND deposito_id = NEW.deposito_id 
      AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL));
      
    IF NOT FOUND THEN
        INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia)
        VALUES (NEW.producto_id, NEW.deposito_id, NEW.lote_id, NEW.cantidad);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: procesar_inventario_factura_venta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.procesar_inventario_factura_venta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE inventario_stock
    SET existencia = existencia - NEW.cantidad
    WHERE producto_id = NEW.producto_id 
      AND deposito_id = NEW.deposito_id 
      AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL));
      
    IF NOT FOUND THEN
        INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia)
        VALUES (NEW.producto_id, NEW.deposito_id, NEW.lote_id, -NEW.cantidad);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: procesar_inventario_movimiento(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.procesar_inventario_movimiento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tipo_movimiento varchar;
    v_deposito_origen integer;
    v_deposito_destino integer;
BEGIN
    SELECT tipo_movimiento, deposito_origen_id, deposito_destino_id
    INTO v_tipo_movimiento, v_deposito_origen, v_deposito_destino
    FROM inventario_movimientos
    WHERE id = NEW.movimiento_id;

    IF v_tipo_movimiento = 'CARGO' THEN
        UPDATE inventario_stock
        SET existencia = existencia + NEW.cantidad
        WHERE producto_id = NEW.producto_id 
          AND deposito_id = v_deposito_destino
          AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL));
          
        IF NOT FOUND THEN
            INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia)
            VALUES (NEW.producto_id, v_deposito_destino, NEW.lote_id, NEW.cantidad);
        END IF;
          
    ELSIF v_tipo_movimiento = 'DESCARGO' THEN
        UPDATE inventario_stock
        SET existencia = existencia - NEW.cantidad
        WHERE producto_id = NEW.producto_id 
          AND deposito_id = v_deposito_origen
          AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL));
          
        IF NOT FOUND THEN
            INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia)
            VALUES (NEW.producto_id, v_deposito_origen, NEW.lote_id, -NEW.cantidad);
        END IF;
          
    ELSIF v_tipo_movimiento = 'TRANSFERENCIA' THEN
        UPDATE inventario_stock
        SET existencia = existencia - NEW.cantidad
        WHERE producto_id = NEW.producto_id AND deposito_id = v_deposito_origen
          AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL));
          
        IF NOT FOUND THEN
            INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia)
            VALUES (NEW.producto_id, v_deposito_origen, NEW.lote_id, -NEW.cantidad);
        END IF;
        
        UPDATE inventario_stock
        SET existencia = existencia + NEW.cantidad
        WHERE producto_id = NEW.producto_id AND deposito_id = v_deposito_destino
          AND (lote_id = NEW.lote_id OR (lote_id IS NULL AND NEW.lote_id IS NULL));
          
        IF NOT FOUND THEN
            INSERT INTO inventario_stock (producto_id, deposito_id, lote_id, existencia)
            VALUES (NEW.producto_id, v_deposito_destino, NEW.lote_id, NEW.cantidad);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bancos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bancos (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    activo boolean DEFAULT true
);


--
-- Name: bancos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bancos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bancos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bancos_id_seq OWNED BY public.bancos.id;


--
-- Name: categoria_precios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categoria_precios (
    categoria_id integer NOT NULL,
    nivel_precio_id integer NOT NULL,
    porcentaje_utilidad numeric(8,2) DEFAULT 0.0000 NOT NULL,
    porcentaje_descuento numeric(8,2) DEFAULT 0.0000 NOT NULL
);


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    telefono character varying(40),
    email character varying(100),
    limite_credito numeric(18,2) DEFAULT 0.0000,
    dias_credito integer DEFAULT 0,
    contribuyente_especial boolean DEFAULT false NOT NULL,
    apellido character varying(150),
    tipo_documento character varying(5),
    numero_documento character varying(50),
    notas text,
    CONSTRAINT chk_clientes_telefono_formato CHECK (((telefono IS NULL) OR ((telefono)::text ~ '^\+?[0-9]+$'::text))),
    CONSTRAINT clientes_dias_credito_check CHECK ((dias_credito >= 0))
);


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: cuentas_bancarias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cuentas_bancarias (
    id integer NOT NULL,
    banco_id integer NOT NULL,
    numero_cuenta character varying(40) NOT NULL,
    tipo_cuenta character varying(30),
    moneda_id integer NOT NULL,
    descripcion character varying(100),
    saldo_conciliado numeric(18,2) DEFAULT 0.0000,
    activo boolean DEFAULT true,
    CONSTRAINT cuentas_bancarias_tipo_cuenta_check CHECK (((tipo_cuenta)::text = ANY (ARRAY[('CORRIENTE'::character varying)::text, ('AHORROS'::character varying)::text, ('FIDEICOMISO'::character varying)::text, ('EXTRANJERA'::character varying)::text])))
);


--
-- Name: cuentas_bancarias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cuentas_bancarias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cuentas_bancarias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cuentas_bancarias_id_seq OWNED BY public.cuentas_bancarias.id;


--
-- Name: cuentas_cobrar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cuentas_cobrar (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    tipo_documento character varying(20) NOT NULL,
    numero_documento character varying(40) NOT NULL,
    factura_id integer,
    devolucion_id integer,
    fecha_emision timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_vencimiento date NOT NULL,
    monto_original numeric(18,2) NOT NULL,
    saldo_pendiente numeric(18,2) NOT NULL,
    moneda_id integer NOT NULL,
    tasa_cambio numeric(18,2) NOT NULL,
    status character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cuentas_cobrar_status_check CHECK (((status)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('PAGADO'::character varying)::text, ('ANULADO'::character varying)::text]))),
    CONSTRAINT cuentas_cobrar_tipo_documento_check CHECK (((tipo_documento)::text = ANY ((ARRAY['FACTURA'::character varying, 'NOTA_DEBITO'::character varying, 'NOTA_CREDITO'::character varying, 'ANTICIPO'::character varying, 'DEVOLUCION'::character varying, 'ABONO'::character varying, 'PAGO'::character varying, 'DESCUENTO_PRONTO_PAGO'::character varying, 'AUMENTO_MORA'::character varying])::text[])))
);


--
-- Name: cuentas_cobrar_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cuentas_cobrar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cuentas_cobrar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cuentas_cobrar_id_seq OWNED BY public.cuentas_cobrar.id;


--
-- Name: cuentas_pagar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cuentas_pagar (
    id integer NOT NULL,
    proveedor_id integer NOT NULL,
    tipo_documento character varying(20) NOT NULL,
    numero_documento character varying(40) NOT NULL,
    compra_id integer,
    fecha_emision timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_vencimiento date NOT NULL,
    monto_original numeric(18,2) NOT NULL,
    saldo_pendiente numeric(18,2) NOT NULL,
    moneda_id integer NOT NULL,
    tasa_cambio numeric(18,2) NOT NULL,
    status character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cuentas_pagar_status_check CHECK (((status)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('PAGADO'::character varying)::text, ('ANULADO'::character varying)::text]))),
    CONSTRAINT cuentas_pagar_tipo_documento_check CHECK (((tipo_documento)::text = ANY ((ARRAY['FACTURA'::character varying, 'NOTA_DEBITO'::character varying, 'NOTA_CREDITO'::character varying, 'ANTICIPO'::character varying, 'DEVOLUCION'::character varying, 'ABONO'::character varying, 'PAGO'::character varying, 'DESCUENTO_PRONTO_PAGO'::character varying, 'AUMENTO_MORA'::character varying])::text[])))
);


--
-- Name: cuentas_pagar_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cuentas_pagar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cuentas_pagar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cuentas_pagar_id_seq OWNED BY public.cuentas_pagar.id;


--
-- Name: depositos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depositos (
    id integer NOT NULL,
    sucursal_id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(100) NOT NULL,
    responsable character varying(100),
    activo boolean DEFAULT true,
    permite_facturar boolean DEFAULT true
);


--
-- Name: depositos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.depositos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: depositos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.depositos_id_seq OWNED BY public.depositos.id;


--
-- Name: devolucion_venta_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devolucion_venta_detalles (
    id integer NOT NULL,
    devolucion_id integer NOT NULL,
    producto_id integer NOT NULL,
    deposito_id integer NOT NULL,
    lote_id integer,
    cantidad numeric(18,2) NOT NULL,
    precio_unitario numeric(18,2) NOT NULL,
    es_exento boolean DEFAULT false NOT NULL,
    impuesto_porcentaje numeric(5,2) DEFAULT 0.00 NOT NULL,
    monto_iva_linea numeric(18,2) DEFAULT 0.0000 NOT NULL,
    neto_linea numeric(18,2) NOT NULL,
    CONSTRAINT devolucion_venta_detalles_cantidad_check CHECK ((cantidad > (0)::numeric)),
    CONSTRAINT devolucion_venta_detalles_monto_iva_linea_check CHECK ((monto_iva_linea >= (0)::numeric)),
    CONSTRAINT devolucion_venta_detalles_neto_linea_check CHECK ((neto_linea >= (0)::numeric)),
    CONSTRAINT devolucion_venta_detalles_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);


--
-- Name: devolucion_venta_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.devolucion_venta_detalles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devolucion_venta_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.devolucion_venta_detalles_id_seq OWNED BY public.devolucion_venta_detalles.id;


--
-- Name: devoluciones_ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devoluciones_ventas (
    id integer NOT NULL,
    sucursal_id integer NOT NULL,
    numero_devolucion character varying(30) NOT NULL,
    factura_id integer,
    cliente_id integer NOT NULL,
    fecha_devolucion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    moneda_id integer NOT NULL,
    tasa_cambio numeric(18,2) NOT NULL,
    base_exenta numeric(18,2) DEFAULT 0.0000 NOT NULL,
    base_imponible numeric(18,2) DEFAULT 0.0000 NOT NULL,
    monto_iva numeric(18,2) DEFAULT 0.0000 NOT NULL,
    total_neto numeric(18,2) NOT NULL,
    usuario_id integer NOT NULL,
    motivo text NOT NULL,
    aplica_retencion_iva boolean DEFAULT false NOT NULL,
    porcentaje_retencion_iva numeric(5,2) DEFAULT 0.00 NOT NULL,
    monto_retencion_iva numeric(18,2) DEFAULT 0.00 NOT NULL,
    monto_iva_cobrado numeric(18,2) DEFAULT 0.00 NOT NULL,
    estado character varying(50) DEFAULT 'PENDIENTE'::character varying,
    CONSTRAINT devoluciones_ventas_base_exenta_check CHECK ((base_exenta >= (0)::numeric)),
    CONSTRAINT devoluciones_ventas_base_imponible_check CHECK ((base_imponible >= (0)::numeric)),
    CONSTRAINT devoluciones_ventas_monto_iva_check CHECK ((monto_iva >= (0)::numeric)),
    CONSTRAINT devoluciones_ventas_total_neto_check CHECK ((total_neto >= (0)::numeric))
);


--
-- Name: devoluciones_ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.devoluciones_ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devoluciones_ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.devoluciones_ventas_id_seq OWNED BY public.devoluciones_ventas.id;


--
-- Name: documentos_preliminares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos_preliminares (
    id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    sucursal_id integer NOT NULL,
    usuario_id integer NOT NULL,
    etiqueta character varying(150) NOT NULL,
    payload jsonb NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT documentos_preliminares_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['FACTURA'::character varying, 'TRANSFERENCIA'::character varying, 'INV_CARGO'::character varying, 'INV_DESCARGO'::character varying])::text[])))
);


--
-- Name: documentos_preliminares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documentos_preliminares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documentos_preliminares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documentos_preliminares_id_seq OWNED BY public.documentos_preliminares.id;


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    siglas character varying(40),
    rif character varying(20) NOT NULL,
    nit character varying(20),
    direccion_fiscal text,
    direccion_despacho text,
    telefono character varying(40),
    email character varying(100),
    website character varying(100),
    logo bytea,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    igtf_activo boolean DEFAULT false,
    igtf_porcentaje numeric(5,2) DEFAULT 0.00
);


--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- Name: factura_compra_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factura_compra_detalles (
    id integer NOT NULL,
    compra_id integer NOT NULL,
    producto_id integer NOT NULL,
    deposito_id integer NOT NULL,
    lote_id integer,
    cantidad numeric(18,2) NOT NULL,
    costo_unitario numeric(18,2) NOT NULL,
    es_exento boolean DEFAULT false NOT NULL,
    impuesto_porcentaje numeric(5,2) DEFAULT 0.00 NOT NULL,
    monto_iva_linea numeric(18,2) DEFAULT 0.0000 NOT NULL,
    neto_linea numeric(18,2) NOT NULL,
    CONSTRAINT factura_compra_detalles_cantidad_check CHECK ((cantidad > (0)::numeric)),
    CONSTRAINT factura_compra_detalles_costo_unitario_check CHECK ((costo_unitario >= (0)::numeric)),
    CONSTRAINT factura_compra_detalles_impuesto_porcentaje_check CHECK ((impuesto_porcentaje >= (0)::numeric)),
    CONSTRAINT factura_compra_detalles_monto_iva_linea_check CHECK ((monto_iva_linea >= (0)::numeric)),
    CONSTRAINT factura_compra_detalles_neto_linea_check CHECK ((neto_linea >= (0)::numeric))
);


--
-- Name: factura_compra_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.factura_compra_detalles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: factura_compra_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.factura_compra_detalles_id_seq OWNED BY public.factura_compra_detalles.id;


--
-- Name: factura_vendedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factura_vendedores (
    id integer NOT NULL,
    factura_id integer NOT NULL,
    vendedor_id integer,
    usuario_id integer,
    rol_en_venta character varying(30) DEFAULT 'PRINCIPAL'::character varying,
    porcentaje numeric(5,2) DEFAULT 100.00 NOT NULL,
    monto_comision numeric(14,2) DEFAULT 0.00,
    creado_en timestamp without time zone DEFAULT now()
);


--
-- Name: factura_vendedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.factura_vendedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: factura_vendedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.factura_vendedores_id_seq OWNED BY public.factura_vendedores.id;


--
-- Name: factura_venta_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factura_venta_detalles (
    id integer NOT NULL,
    factura_id integer NOT NULL,
    producto_id integer NOT NULL,
    deposito_id integer NOT NULL,
    lote_id integer,
    cantidad numeric(18,2) NOT NULL,
    precio_unitario numeric(18,2) NOT NULL,
    descuento_porcentaje numeric(5,2) DEFAULT 0.00,
    es_exento boolean DEFAULT false NOT NULL,
    impuesto_porcentaje numeric(5,2) DEFAULT 0.00 NOT NULL,
    monto_iva_linea numeric(18,2) DEFAULT 0.0000 NOT NULL,
    neto_linea numeric(18,2) NOT NULL,
    costo_operacion numeric(18,2) NOT NULL,
    CONSTRAINT factura_venta_detalles_cantidad_check CHECK ((cantidad > (0)::numeric)),
    CONSTRAINT factura_venta_detalles_costo_operacion_check CHECK ((costo_operacion >= (0)::numeric)),
    CONSTRAINT factura_venta_detalles_descuento_porcentaje_check CHECK (((descuento_porcentaje >= (0)::numeric) AND (descuento_porcentaje <= (100)::numeric))),
    CONSTRAINT factura_venta_detalles_impuesto_porcentaje_check CHECK ((impuesto_porcentaje >= (0)::numeric)),
    CONSTRAINT factura_venta_detalles_monto_iva_linea_check CHECK ((monto_iva_linea >= (0)::numeric)),
    CONSTRAINT factura_venta_detalles_neto_linea_check CHECK ((neto_linea >= (0)::numeric)),
    CONSTRAINT factura_venta_detalles_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);


--
-- Name: factura_venta_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.factura_venta_detalles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: factura_venta_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.factura_venta_detalles_id_seq OWNED BY public.factura_venta_detalles.id;


--
-- Name: facturas_compras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facturas_compras (
    id integer NOT NULL,
    sucursal_id integer NOT NULL,
    numero_factura character varying(40) NOT NULL,
    proveedor_id integer NOT NULL,
    fecha_emision timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_vencimiento date NOT NULL,
    moneda_id integer NOT NULL,
    tasa_cambio numeric(18,2) NOT NULL,
    status character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    total_bruto numeric(18,2) NOT NULL,
    base_exenta numeric(18,2) DEFAULT 0.0000 NOT NULL,
    base_imponible numeric(18,2) DEFAULT 0.0000 NOT NULL,
    monto_iva numeric(18,2) DEFAULT 0.0000 NOT NULL,
    igtf_porcentaje numeric(5,2) DEFAULT 0.00 NOT NULL,
    igtf_monto numeric(18,2) DEFAULT 0.0000 NOT NULL,
    total_neto numeric(18,2) NOT NULL,
    usuario_id integer NOT NULL,
    observaciones text,
    CONSTRAINT facturas_compras_base_exenta_check CHECK ((base_exenta >= (0)::numeric)),
    CONSTRAINT facturas_compras_base_imponible_check CHECK ((base_imponible >= (0)::numeric)),
    CONSTRAINT facturas_compras_igtf_monto_check CHECK ((igtf_monto >= (0)::numeric)),
    CONSTRAINT facturas_compras_igtf_porcentaje_check CHECK ((igtf_porcentaje >= (0)::numeric)),
    CONSTRAINT facturas_compras_monto_iva_check CHECK ((monto_iva >= (0)::numeric)),
    CONSTRAINT facturas_compras_status_check CHECK (((status)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('PAGADA'::character varying)::text, ('ANULADA'::character varying)::text])))
);


--
-- Name: facturas_compras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facturas_compras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facturas_compras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facturas_compras_id_seq OWNED BY public.facturas_compras.id;


--
-- Name: facturas_ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facturas_ventas (
    id integer NOT NULL,
    sucursal_id integer NOT NULL,
    numero_factura character varying(30) NOT NULL,
    numero_control character varying(30),
    cliente_id integer NOT NULL,
    fecha_emision timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_vencimiento date NOT NULL,
    moneda_id integer NOT NULL,
    tasa_cambio numeric(18,2) DEFAULT 1.000000 NOT NULL,
    status character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    total_bruto numeric(18,2) NOT NULL,
    descuento_monto numeric(18,2) DEFAULT 0.0000,
    base_exenta numeric(18,2) DEFAULT 0.0000 NOT NULL,
    base_imponible numeric(18,2) DEFAULT 0.0000 NOT NULL,
    monto_iva numeric(18,2) DEFAULT 0.0000 NOT NULL,
    igtf_porcentaje numeric(5,2) DEFAULT 0.00 NOT NULL,
    igtf_monto numeric(18,2) DEFAULT 0.0000 NOT NULL,
    total_neto numeric(18,2) NOT NULL,
    usuario_id integer NOT NULL,
    observaciones text,
    aplica_retencion_iva boolean DEFAULT false NOT NULL,
    porcentaje_retencion_iva numeric(5,2) DEFAULT 0.00 NOT NULL,
    monto_retencion_iva numeric(18,2) DEFAULT 0.00 NOT NULL,
    monto_iva_cobrado numeric(18,2) DEFAULT 0.00 NOT NULL,
    vendedor_id integer,
    porcentaje_vendedor_1 numeric(5,2) DEFAULT 100.00,
    vendedor_secundario_id integer,
    porcentaje_vendedor_2 numeric(5,2) DEFAULT 0.00,
    CONSTRAINT facturas_ventas_base_exenta_check CHECK ((base_exenta >= (0)::numeric)),
    CONSTRAINT facturas_ventas_base_imponible_check CHECK ((base_imponible >= (0)::numeric)),
    CONSTRAINT facturas_ventas_descuento_monto_check CHECK ((descuento_monto >= (0)::numeric)),
    CONSTRAINT facturas_ventas_igtf_monto_check CHECK ((igtf_monto >= (0)::numeric)),
    CONSTRAINT facturas_ventas_igtf_porcentaje_check CHECK ((igtf_porcentaje >= (0)::numeric)),
    CONSTRAINT facturas_ventas_monto_iva_check CHECK ((monto_iva >= (0)::numeric)),
    CONSTRAINT facturas_ventas_status_check CHECK (((status)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('PAGADA'::character varying)::text, ('ANULADA'::character varying)::text])))
);


--
-- Name: facturas_ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facturas_ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facturas_ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facturas_ventas_id_seq OWNED BY public.facturas_ventas.id;


--
-- Name: impresoras_sucursal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impresoras_sucursal (
    id integer NOT NULL,
    sucursal_id integer NOT NULL,
    area character varying(20) NOT NULL,
    nombre_impresora character varying(150) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT impresoras_sucursal_area_check CHECK (((area)::text = ANY ((ARRAY['FACTURA'::character varying, 'CORTE'::character varying])::text[])))
);


--
-- Name: impresoras_sucursal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.impresoras_sucursal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: impresoras_sucursal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.impresoras_sucursal_id_seq OWNED BY public.impresoras_sucursal.id;


--
-- Name: inv_reglas_transformacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inv_reglas_transformacion (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    tipo_transformacion character varying(30) NOT NULL,
    factor numeric(10,4) DEFAULT 1 NOT NULL,
    split_items jsonb,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT inv_reglas_transformacion_tipo_check CHECK (((tipo_transformacion)::text = ANY ((ARRAY['POR_METRO'::character varying, 'ROLLO_A_METROS'::character varying, 'TAZAS'::character varying, 'HOJILLA_COMBO'::character varying, 'SPLIT_FIJO'::character varying])::text[])))
);


--
-- Name: inv_reglas_transformacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inv_reglas_transformacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inv_reglas_transformacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inv_reglas_transformacion_id_seq OWNED BY public.inv_reglas_transformacion.id;


--
-- Name: inv_transformaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inv_transformaciones (
    id integer NOT NULL,
    numero_documento character varying(30) NOT NULL,
    sucursal_id integer NOT NULL,
    usuario_id integer NOT NULL,
    producto_origen_id integer,
    cantidad_origen numeric(18,4),
    deposito_id integer,
    estado character varying(20) DEFAULT 'CONFIRMADA'::character varying NOT NULL,
    observacion text,
    items_resultado jsonb NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    deposito_origen_id integer,
    deposito_destino_id integer,
    movimiento_descargo_id integer,
    movimiento_cargo_id integer,
    items_consumidos jsonb DEFAULT '[]'::jsonb,
    costo_total_consumido numeric(18,2) DEFAULT 0.00,
    costo_total_generado numeric(18,2) DEFAULT 0.00,
    peso_total_consumido_kg numeric(18,3) DEFAULT 0.000,
    peso_total_generado_kg numeric(18,3) DEFAULT 0.000,
    descargo_documento character varying(30),
    cargo_documento character varying(30),
    CONSTRAINT inv_transformaciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['CONFIRMADA'::character varying, 'ANULADA'::character varying])::text[])))
);


--
-- Name: inv_transformaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inv_transformaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inv_transformaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inv_transformaciones_id_seq OWNED BY public.inv_transformaciones.id;


--
-- Name: inventario_movimiento_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_movimiento_detalles (
    id integer NOT NULL,
    movimiento_id integer NOT NULL,
    producto_id integer NOT NULL,
    lote_id integer,
    cantidad numeric(18,2) NOT NULL,
    costo_unitario numeric(18,2) DEFAULT 0.0000 NOT NULL,
    cantidad_recibida numeric(18,2),
    peso_kg numeric(18,3) DEFAULT 0.000,
    cantidad_anterior numeric(18,2),
    cantidad_posterior numeric(18,2),
    CONSTRAINT inventario_movimiento_detalles_cantidad_check CHECK ((cantidad > (0)::numeric)),
    CONSTRAINT inventario_movimiento_detalles_costo_unitario_check CHECK ((costo_unitario >= (0)::numeric))
);


--
-- Name: inventario_movimiento_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_movimiento_detalles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_movimiento_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_movimiento_detalles_id_seq OWNED BY public.inventario_movimiento_detalles.id;


--
-- Name: inventario_movimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_movimientos (
    id integer NOT NULL,
    sucursal_id integer NOT NULL,
    numero_documento character varying(30) NOT NULL,
    tipo_movimiento character varying(20) NOT NULL,
    deposito_origen_id integer,
    deposito_destino_id integer,
    fecha_operacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    motivo character varying(100) NOT NULL,
    usuario_id integer NOT NULL,
    observaciones text,
    estado character varying(50),
    categoria character varying(30),
    peso_total_kg numeric(18,3) DEFAULT 0.000,
    documento_origen character varying(40),
    movimiento_origen_id integer,
    CONSTRAINT chk_transferencia_depositos CHECK (((((tipo_movimiento)::text = 'TRANSFERENCIA'::text) AND (deposito_origen_id IS NOT NULL) AND (deposito_destino_id IS NOT NULL) AND (deposito_origen_id <> deposito_destino_id)) OR (((tipo_movimiento)::text = 'CARGO'::text) AND (deposito_destino_id IS NOT NULL) AND (deposito_origen_id IS NULL)) OR (((tipo_movimiento)::text = 'DESCARGO'::text) AND (deposito_origen_id IS NOT NULL) AND (deposito_destino_id IS NULL)))),
    CONSTRAINT inventario_movimientos_tipo_movimiento_check CHECK (((tipo_movimiento)::text = ANY (ARRAY[('CARGO'::character varying)::text, ('DESCARGO'::character varying)::text, ('TRANSFERENCIA'::character varying)::text])))
);


--
-- Name: inventario_movimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_movimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_movimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_movimientos_id_seq OWNED BY public.inventario_movimientos.id;


--
-- Name: inventario_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_stock (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    deposito_id integer NOT NULL,
    lote_id integer,
    existencia numeric(18,2) DEFAULT 0.0000 NOT NULL,
    reservado numeric(18,2) DEFAULT 0.0000 NOT NULL,
    ubicacion_estante character varying(50),
    CONSTRAINT inventario_stock_reservado_check CHECK ((reservado >= (0)::numeric))
);


--
-- Name: inventario_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_stock_id_seq OWNED BY public.inventario_stock.id;


--
-- Name: lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lotes (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    numero_lote character varying(50) NOT NULL,
    fecha_vencimiento date NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: lotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lotes_id_seq OWNED BY public.lotes.id;


--
-- Name: metodos_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metodos_pago (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    moneda_id integer NOT NULL,
    activo boolean DEFAULT true,
    requiere_cuenta_bancaria boolean DEFAULT false
);


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metodos_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metodos_pago_id_seq OWNED BY public.metodos_pago.id;


--
-- Name: monedas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monedas (
    id integer NOT NULL,
    codigo_iso character varying(10) NOT NULL,
    descripcion character varying(50) NOT NULL,
    simbolo character varying(10) NOT NULL,
    es_moneda_base boolean DEFAULT false,
    activo boolean DEFAULT true
);


--
-- Name: monedas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monedas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monedas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monedas_id_seq OWNED BY public.monedas.id;


--
-- Name: niveles_precio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.niveles_precio (
    id integer NOT NULL,
    nombre character varying(30) NOT NULL,
    factor_utilidad_defecto numeric(8,2) DEFAULT 0.0000
);


--
-- Name: niveles_precio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.niveles_precio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: niveles_precio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.niveles_precio_id_seq OWNED BY public.niveles_precio.id;


--
-- Name: pago_proveedor_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pago_proveedor_detalles (
    id integer NOT NULL,
    pago_id integer NOT NULL,
    cxp_id integer NOT NULL,
    monto_aplicado numeric(18,2) NOT NULL,
    CONSTRAINT pago_proveedor_detalles_monto_aplicado_check CHECK ((monto_aplicado <> (0)::numeric))
);


--
-- Name: pago_proveedor_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pago_proveedor_detalles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pago_proveedor_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pago_proveedor_detalles_id_seq OWNED BY public.pago_proveedor_detalles.id;


--
-- Name: pagos_proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos_proveedores (
    id integer NOT NULL,
    proveedor_id integer NOT NULL,
    sucursal_id integer NOT NULL,
    numero_pago character varying(30) NOT NULL,
    fecha_pago timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    forma_pago character varying(30) DEFAULT 'TRANSFERENCIA'::character varying NOT NULL,
    monto_total numeric(18,2) NOT NULL,
    moneda_pago_id integer NOT NULL,
    tasa_cambio numeric(18,2) NOT NULL,
    aplica_igtf boolean DEFAULT false NOT NULL,
    igtf_porcentaje numeric(5,2) DEFAULT 0.00 NOT NULL,
    igtf_monto numeric(18,2) DEFAULT 0.0000 NOT NULL,
    cuenta_bancaria_id integer NOT NULL,
    usuario_id integer NOT NULL,
    observaciones text,
    metodo_pago_id integer,
    CONSTRAINT pagos_proveedores_igtf_monto_check CHECK ((igtf_monto >= (0)::numeric)),
    CONSTRAINT pagos_proveedores_igtf_porcentaje_check CHECK ((igtf_porcentaje >= (0)::numeric)),
    CONSTRAINT pagos_proveedores_monto_total_check CHECK ((monto_total > (0)::numeric))
);


--
-- Name: pagos_proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagos_proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_proveedores_id_seq OWNED BY public.pagos_proveedores.id;


--
-- Name: parametros_fiscales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parametros_fiscales (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    descripcion character varying(150) NOT NULL,
    porcentaje numeric(6,2) NOT NULL,
    activo boolean DEFAULT true,
    vigente_desde date DEFAULT CURRENT_DATE NOT NULL,
    vigente_hasta date,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT parametros_fiscales_porcentaje_check CHECK ((porcentaje >= (0)::numeric))
);


--
-- Name: parametros_fiscales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.parametros_fiscales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parametros_fiscales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.parametros_fiscales_id_seq OWNED BY public.parametros_fiscales.id;


--
-- Name: permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permisos (
    id integer NOT NULL,
    clave_permiso character varying(50) NOT NULL,
    modulo character varying(50) NOT NULL,
    descripcion character varying(150) NOT NULL
);


--
-- Name: permisos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permisos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permisos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permisos_id_seq OWNED BY public.permisos.id;


--
-- Name: producto_costos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producto_costos (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    moneda_id integer NOT NULL,
    costo numeric(18,2) NOT NULL,
    fecha_vigencia timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activo boolean DEFAULT true,
    CONSTRAINT chk_costo_positivo CHECK ((costo >= (0)::numeric))
);


--
-- Name: producto_costos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.producto_costos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: producto_costos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.producto_costos_id_seq OWNED BY public.producto_costos.id;


--
-- Name: producto_precios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producto_precios (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    nivel_precio_id integer NOT NULL,
    moneda_id integer NOT NULL,
    precio numeric(18,2) NOT NULL,
    fecha_vigencia timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activo boolean DEFAULT true,
    CONSTRAINT chk_precio_positivo CHECK ((precio >= (0)::numeric))
);


--
-- Name: producto_precios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.producto_precios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: producto_precios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.producto_precios_id_seq OWNED BY public.producto_precios.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    referencia character varying(50),
    nombre character varying(100) NOT NULL,
    descripcion_detallada text,
    categoria_id integer NOT NULL,
    unidad_medida character varying(20) DEFAULT 'UNIDAD'::character varying,
    marca character varying(50),
    moneda_base_id integer NOT NULL,
    precio_costo numeric(18,2) DEFAULT 0.0000 NOT NULL,
    impuesto_porcentaje numeric(5,2) DEFAULT 0.00 NOT NULL,
    maneja_lotes boolean DEFAULT false,
    maneja_seriales boolean DEFAULT false,
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    departamento_id integer,
    modelo character varying(100),
    peso_kg numeric(10,3) DEFAULT 0.000,
    capacidad_contenido numeric(18,4) DEFAULT 1.0000,
    permite_decimales boolean DEFAULT false,
    sujeto_comision_fija boolean DEFAULT false,
    monto_comision numeric(18,2) DEFAULT 0.00,
    precio_venta numeric(18,2) DEFAULT 0 NOT NULL,
    moneda_venta_id integer,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_por integer,
    CONSTRAINT productos_impuesto_porcentaje_check CHECK ((impuesto_porcentaje >= (0)::numeric)),
    CONSTRAINT productos_precio_costo_check CHECK ((precio_costo >= (0)::numeric))
);


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(150) NOT NULL,
    rif character varying(20) NOT NULL,
    nit character varying(20),
    direccion text NOT NULL,
    telefono character varying(40),
    email character varying(100),
    moneda_cuenta_id integer NOT NULL,
    dias_credito integer DEFAULT 0,
    saldo_actual numeric(18,2) DEFAULT 0.0000,
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT proveedores_dias_credito_check CHECK ((dias_credito >= 0))
);


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: recibo_cobro_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recibo_cobro_detalles (
    id integer NOT NULL,
    recibo_id integer NOT NULL,
    cxc_id integer NOT NULL,
    monto_aplicado numeric(18,2) NOT NULL,
    CONSTRAINT recibo_cobro_detalles_monto_aplicado_check CHECK ((monto_aplicado <> (0)::numeric))
);


--
-- Name: recibo_cobro_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recibo_cobro_detalles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recibo_cobro_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recibo_cobro_detalles_id_seq OWNED BY public.recibo_cobro_detalles.id;


--
-- Name: recibos_cobro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recibos_cobro (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    sucursal_id integer NOT NULL,
    numero_recibo character varying(30) NOT NULL,
    fecha_pago timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    forma_pago character varying(30) DEFAULT 'BOLIVARES'::character varying NOT NULL,
    monto_total numeric(18,2) NOT NULL,
    moneda_pago_id integer NOT NULL,
    tasa_cambio numeric(18,2) NOT NULL,
    aplica_igtf boolean DEFAULT false NOT NULL,
    igtf_porcentaje numeric(5,2) DEFAULT 0.00 NOT NULL,
    igtf_monto numeric(18,2) DEFAULT 0.0000 NOT NULL,
    cuenta_bancaria_id integer,
    usuario_id integer NOT NULL,
    observaciones text,
    metodo_pago_id integer,
    CONSTRAINT recibos_cobro_igtf_monto_check CHECK ((igtf_monto >= (0)::numeric)),
    CONSTRAINT recibos_cobro_igtf_porcentaje_check CHECK ((igtf_porcentaje >= (0)::numeric)),
    CONSTRAINT recibos_cobro_monto_total_check CHECK ((monto_total > (0)::numeric))
);


--
-- Name: recibos_cobro_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recibos_cobro_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recibos_cobro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recibos_cobro_id_seq OWNED BY public.recibos_cobro.id;


--
-- Name: rol_permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rol_permisos (
    rol_id integer NOT NULL,
    permiso_id integer NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(150),
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: seriales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seriales (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    numero_serial character varying(100) NOT NULL,
    deposito_id integer,
    vendido boolean DEFAULT false,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: seriales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seriales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seriales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seriales_id_seq OWNED BY public.seriales.id;


--
-- Name: sucursales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sucursales (
    id integer NOT NULL,
    empresa_id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    direccion text,
    telefono character varying(40),
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    siglas character varying(40)
);


--
-- Name: sucursales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sucursales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sucursales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sucursales_id_seq OWNED BY public.sucursales.id;


--
-- Name: tasas_cambio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasas_cambio (
    id integer NOT NULL,
    moneda_id integer NOT NULL,
    fecha_tasa timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    factor numeric(24,18) NOT NULL,
    usuario_id integer,
    CONSTRAINT tasas_cambio_factor_check CHECK ((factor > (0)::numeric))
);


--
-- Name: tasas_cambio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasas_cambio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasas_cambio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasas_cambio_id_seq OWNED BY public.tasas_cambio.id;


--
-- Name: tipos_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_documentos (
    id integer NOT NULL,
    sucursal_id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    correlativo_actual integer DEFAULT 0 NOT NULL,
    longitud_formato integer DEFAULT 8 NOT NULL,
    prefijo character varying(10),
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tipos_documentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipos_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_documentos_id_seq OWNED BY public.tipos_documentos.id;


--
-- Name: usuario_permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_permisos (
    usuario_id integer NOT NULL,
    permiso_id integer NOT NULL,
    tipo character varying(10) DEFAULT 'conceder'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    username character varying(40) NOT NULL,
    clave_hash character varying(255) NOT NULL,
    nombre_completo character varying(100) NOT NULL,
    email character varying(100),
    rol_id integer,
    sucursal_id integer,
    activo boolean DEFAULT true,
    ultimo_acceso timestamp without time zone,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sesion_version integer DEFAULT 1 NOT NULL
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: vendedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendedores (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(100),
    telefono character varying(40),
    comision_porcentaje numeric(5,2) DEFAULT 0.00,
    activo boolean DEFAULT true,
    sucursal_id integer,
    canal character varying(20) DEFAULT 'TIENDA'::character varying,
    CONSTRAINT vendedores_comision_porcentaje_check CHECK ((comision_porcentaje >= (0)::numeric))
);


--
-- Name: vendedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendedores_id_seq OWNED BY public.vendedores.id;


--
-- Name: bancos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bancos ALTER COLUMN id SET DEFAULT nextval('public.bancos_id_seq'::regclass);


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: cuentas_bancarias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_bancarias ALTER COLUMN id SET DEFAULT nextval('public.cuentas_bancarias_id_seq'::regclass);


--
-- Name: cuentas_cobrar id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_cobrar ALTER COLUMN id SET DEFAULT nextval('public.cuentas_cobrar_id_seq'::regclass);


--
-- Name: cuentas_pagar id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_pagar ALTER COLUMN id SET DEFAULT nextval('public.cuentas_pagar_id_seq'::regclass);


--
-- Name: depositos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depositos ALTER COLUMN id SET DEFAULT nextval('public.depositos_id_seq'::regclass);


--
-- Name: devolucion_venta_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_venta_detalles ALTER COLUMN id SET DEFAULT nextval('public.devolucion_venta_detalles_id_seq'::regclass);


--
-- Name: devoluciones_ventas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_ventas ALTER COLUMN id SET DEFAULT nextval('public.devoluciones_ventas_id_seq'::regclass);


--
-- Name: documentos_preliminares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_preliminares ALTER COLUMN id SET DEFAULT nextval('public.documentos_preliminares_id_seq'::regclass);


--
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: factura_compra_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_compra_detalles ALTER COLUMN id SET DEFAULT nextval('public.factura_compra_detalles_id_seq'::regclass);


--
-- Name: factura_vendedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_vendedores ALTER COLUMN id SET DEFAULT nextval('public.factura_vendedores_id_seq'::regclass);


--
-- Name: factura_venta_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_venta_detalles ALTER COLUMN id SET DEFAULT nextval('public.factura_venta_detalles_id_seq'::regclass);


--
-- Name: facturas_compras id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_compras ALTER COLUMN id SET DEFAULT nextval('public.facturas_compras_id_seq'::regclass);


--
-- Name: facturas_ventas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_ventas ALTER COLUMN id SET DEFAULT nextval('public.facturas_ventas_id_seq'::regclass);


--
-- Name: impresoras_sucursal id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impresoras_sucursal ALTER COLUMN id SET DEFAULT nextval('public.impresoras_sucursal_id_seq'::regclass);


--
-- Name: inv_reglas_transformacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_reglas_transformacion ALTER COLUMN id SET DEFAULT nextval('public.inv_reglas_transformacion_id_seq'::regclass);


--
-- Name: inv_transformaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_transformaciones ALTER COLUMN id SET DEFAULT nextval('public.inv_transformaciones_id_seq'::regclass);


--
-- Name: inventario_movimiento_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimiento_detalles ALTER COLUMN id SET DEFAULT nextval('public.inventario_movimiento_detalles_id_seq'::regclass);


--
-- Name: inventario_movimientos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos ALTER COLUMN id SET DEFAULT nextval('public.inventario_movimientos_id_seq'::regclass);


--
-- Name: inventario_stock id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_stock ALTER COLUMN id SET DEFAULT nextval('public.inventario_stock_id_seq'::regclass);


--
-- Name: lotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes ALTER COLUMN id SET DEFAULT nextval('public.lotes_id_seq'::regclass);


--
-- Name: metodos_pago id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago ALTER COLUMN id SET DEFAULT nextval('public.metodos_pago_id_seq'::regclass);


--
-- Name: monedas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monedas ALTER COLUMN id SET DEFAULT nextval('public.monedas_id_seq'::regclass);


--
-- Name: niveles_precio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.niveles_precio ALTER COLUMN id SET DEFAULT nextval('public.niveles_precio_id_seq'::regclass);


--
-- Name: pago_proveedor_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago_proveedor_detalles ALTER COLUMN id SET DEFAULT nextval('public.pago_proveedor_detalles_id_seq'::regclass);


--
-- Name: pagos_proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_proveedores ALTER COLUMN id SET DEFAULT nextval('public.pagos_proveedores_id_seq'::regclass);


--
-- Name: parametros_fiscales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_fiscales ALTER COLUMN id SET DEFAULT nextval('public.parametros_fiscales_id_seq'::regclass);


--
-- Name: permisos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos ALTER COLUMN id SET DEFAULT nextval('public.permisos_id_seq'::regclass);


--
-- Name: producto_costos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_costos ALTER COLUMN id SET DEFAULT nextval('public.producto_costos_id_seq'::regclass);


--
-- Name: producto_precios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_precios ALTER COLUMN id SET DEFAULT nextval('public.producto_precios_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: recibo_cobro_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibo_cobro_detalles ALTER COLUMN id SET DEFAULT nextval('public.recibo_cobro_detalles_id_seq'::regclass);


--
-- Name: recibos_cobro id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibos_cobro ALTER COLUMN id SET DEFAULT nextval('public.recibos_cobro_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: seriales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seriales ALTER COLUMN id SET DEFAULT nextval('public.seriales_id_seq'::regclass);


--
-- Name: sucursales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales ALTER COLUMN id SET DEFAULT nextval('public.sucursales_id_seq'::regclass);


--
-- Name: tasas_cambio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasas_cambio ALTER COLUMN id SET DEFAULT nextval('public.tasas_cambio_id_seq'::regclass);


--
-- Name: tipos_documentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_documentos ALTER COLUMN id SET DEFAULT nextval('public.tipos_documentos_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: vendedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendedores ALTER COLUMN id SET DEFAULT nextval('public.vendedores_id_seq'::regclass);


--
-- Name: bancos bancos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bancos
    ADD CONSTRAINT bancos_codigo_key UNIQUE (codigo);


--
-- Name: bancos bancos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bancos
    ADD CONSTRAINT bancos_pkey PRIMARY KEY (id);


--
-- Name: categoria_precios categoria_precios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria_precios
    ADD CONSTRAINT categoria_precios_pkey PRIMARY KEY (categoria_id, nivel_precio_id);


--
-- Name: categorias categorias_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_codigo_key UNIQUE (codigo);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_numero_documento_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_numero_documento_key UNIQUE (numero_documento);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: cuentas_bancarias cuentas_bancarias_numero_cuenta_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_bancarias
    ADD CONSTRAINT cuentas_bancarias_numero_cuenta_key UNIQUE (numero_cuenta);


--
-- Name: cuentas_bancarias cuentas_bancarias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_bancarias
    ADD CONSTRAINT cuentas_bancarias_pkey PRIMARY KEY (id);


--
-- Name: cuentas_cobrar cuentas_cobrar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_cobrar
    ADD CONSTRAINT cuentas_cobrar_pkey PRIMARY KEY (id);


--
-- Name: cuentas_pagar cuentas_pagar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_pagar
    ADD CONSTRAINT cuentas_pagar_pkey PRIMARY KEY (id);


--
-- Name: depositos depositos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depositos
    ADD CONSTRAINT depositos_codigo_key UNIQUE (codigo);


--
-- Name: depositos depositos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depositos
    ADD CONSTRAINT depositos_pkey PRIMARY KEY (id);


--
-- Name: devolucion_venta_detalles devolucion_venta_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_venta_detalles
    ADD CONSTRAINT devolucion_venta_detalles_pkey PRIMARY KEY (id);


--
-- Name: devoluciones_ventas devoluciones_ventas_numero_devolucion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_ventas
    ADD CONSTRAINT devoluciones_ventas_numero_devolucion_key UNIQUE (numero_devolucion);


--
-- Name: devoluciones_ventas devoluciones_ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_ventas
    ADD CONSTRAINT devoluciones_ventas_pkey PRIMARY KEY (id);


--
-- Name: documentos_preliminares documentos_preliminares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_preliminares
    ADD CONSTRAINT documentos_preliminares_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_rif_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_rif_key UNIQUE (rif);


--
-- Name: factura_compra_detalles factura_compra_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_compra_detalles
    ADD CONSTRAINT factura_compra_detalles_pkey PRIMARY KEY (id);


--
-- Name: factura_vendedores factura_vendedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_vendedores
    ADD CONSTRAINT factura_vendedores_pkey PRIMARY KEY (id);


--
-- Name: factura_venta_detalles factura_venta_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_venta_detalles
    ADD CONSTRAINT factura_venta_detalles_pkey PRIMARY KEY (id);


--
-- Name: facturas_compras facturas_compras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_compras
    ADD CONSTRAINT facturas_compras_pkey PRIMARY KEY (id);


--
-- Name: facturas_ventas facturas_ventas_numero_control_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_ventas
    ADD CONSTRAINT facturas_ventas_numero_control_key UNIQUE (numero_control);


--
-- Name: facturas_ventas facturas_ventas_numero_factura_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_ventas
    ADD CONSTRAINT facturas_ventas_numero_factura_key UNIQUE (numero_factura);


--
-- Name: facturas_ventas facturas_ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_ventas
    ADD CONSTRAINT facturas_ventas_pkey PRIMARY KEY (id);


--
-- Name: impresoras_sucursal impresoras_sucursal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impresoras_sucursal
    ADD CONSTRAINT impresoras_sucursal_pkey PRIMARY KEY (id);


--
-- Name: impresoras_sucursal impresoras_sucursal_sucursal_id_area_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impresoras_sucursal
    ADD CONSTRAINT impresoras_sucursal_sucursal_id_area_key UNIQUE (sucursal_id, area);


--
-- Name: inv_reglas_transformacion inv_reglas_transformacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_reglas_transformacion
    ADD CONSTRAINT inv_reglas_transformacion_pkey PRIMARY KEY (id);


--
-- Name: inv_transformaciones inv_transformaciones_numero_documento_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_transformaciones
    ADD CONSTRAINT inv_transformaciones_numero_documento_key UNIQUE (numero_documento);


--
-- Name: inv_transformaciones inv_transformaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_transformaciones
    ADD CONSTRAINT inv_transformaciones_pkey PRIMARY KEY (id);


--
-- Name: inventario_movimiento_detalles inventario_movimiento_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimiento_detalles
    ADD CONSTRAINT inventario_movimiento_detalles_pkey PRIMARY KEY (id);


--
-- Name: inventario_movimientos inventario_movimientos_numero_documento_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT inventario_movimientos_numero_documento_key UNIQUE (numero_documento);


--
-- Name: inventario_movimientos inventario_movimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT inventario_movimientos_pkey PRIMARY KEY (id);


--
-- Name: inventario_stock inventario_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_stock
    ADD CONSTRAINT inventario_stock_pkey PRIMARY KEY (id);


--
-- Name: lotes lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_pkey PRIMARY KEY (id);


--
-- Name: metodos_pago metodos_pago_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_codigo_key UNIQUE (codigo);


--
-- Name: metodos_pago metodos_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_pkey PRIMARY KEY (id);


--
-- Name: monedas monedas_codigo_iso_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monedas
    ADD CONSTRAINT monedas_codigo_iso_key UNIQUE (codigo_iso);


--
-- Name: monedas monedas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monedas
    ADD CONSTRAINT monedas_pkey PRIMARY KEY (id);


--
-- Name: niveles_precio niveles_precio_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.niveles_precio
    ADD CONSTRAINT niveles_precio_nombre_key UNIQUE (nombre);


--
-- Name: niveles_precio niveles_precio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.niveles_precio
    ADD CONSTRAINT niveles_precio_pkey PRIMARY KEY (id);


--
-- Name: pago_proveedor_detalles pago_proveedor_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago_proveedor_detalles
    ADD CONSTRAINT pago_proveedor_detalles_pkey PRIMARY KEY (id);


--
-- Name: pagos_proveedores pagos_proveedores_numero_pago_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_proveedores
    ADD CONSTRAINT pagos_proveedores_numero_pago_key UNIQUE (numero_pago);


--
-- Name: pagos_proveedores pagos_proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_proveedores
    ADD CONSTRAINT pagos_proveedores_pkey PRIMARY KEY (id);


--
-- Name: parametros_fiscales parametros_fiscales_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_fiscales
    ADD CONSTRAINT parametros_fiscales_codigo_key UNIQUE (codigo);


--
-- Name: parametros_fiscales parametros_fiscales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_fiscales
    ADD CONSTRAINT parametros_fiscales_pkey PRIMARY KEY (id);


--
-- Name: permisos permisos_clave_permiso_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_clave_permiso_key UNIQUE (clave_permiso);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id);


--
-- Name: producto_costos producto_costos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_costos
    ADD CONSTRAINT producto_costos_pkey PRIMARY KEY (id);


--
-- Name: producto_precios producto_precios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_precios
    ADD CONSTRAINT producto_precios_pkey PRIMARY KEY (id);


--
-- Name: productos productos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_codigo_key UNIQUE (codigo);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_codigo_key UNIQUE (codigo);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_rif_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_rif_key UNIQUE (rif);


--
-- Name: recibo_cobro_detalles recibo_cobro_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibo_cobro_detalles
    ADD CONSTRAINT recibo_cobro_detalles_pkey PRIMARY KEY (id);


--
-- Name: recibos_cobro recibos_cobro_numero_recibo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibos_cobro
    ADD CONSTRAINT recibos_cobro_numero_recibo_key UNIQUE (numero_recibo);


--
-- Name: recibos_cobro recibos_cobro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibos_cobro
    ADD CONSTRAINT recibos_cobro_pkey PRIMARY KEY (id);


--
-- Name: rol_permisos rol_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_pkey PRIMARY KEY (rol_id, permiso_id);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: seriales seriales_numero_serial_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seriales
    ADD CONSTRAINT seriales_numero_serial_key UNIQUE (numero_serial);


--
-- Name: seriales seriales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seriales
    ADD CONSTRAINT seriales_pkey PRIMARY KEY (id);


--
-- Name: sucursales sucursales_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_codigo_key UNIQUE (codigo);


--
-- Name: sucursales sucursales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_pkey PRIMARY KEY (id);


--
-- Name: tasas_cambio tasas_cambio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasas_cambio
    ADD CONSTRAINT tasas_cambio_pkey PRIMARY KEY (id);


--
-- Name: tipos_documentos tipos_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_documentos
    ADD CONSTRAINT tipos_documentos_pkey PRIMARY KEY (id);


--
-- Name: tasas_cambio uq_moneda_fecha; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasas_cambio
    ADD CONSTRAINT uq_moneda_fecha UNIQUE (moneda_id, fecha_tasa);


--
-- Name: pago_proveedor_detalles uq_pago_cxp; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago_proveedor_detalles
    ADD CONSTRAINT uq_pago_cxp UNIQUE (pago_id, cxp_id);


--
-- Name: lotes uq_producto_lote; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT uq_producto_lote UNIQUE (producto_id, numero_lote);


--
-- Name: producto_precios uq_producto_precios_prod_nivel; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_precios
    ADD CONSTRAINT uq_producto_precios_prod_nivel UNIQUE (producto_id, nivel_precio_id);


--
-- Name: facturas_compras uq_proveedor_factura; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_compras
    ADD CONSTRAINT uq_proveedor_factura UNIQUE (proveedor_id, numero_factura);


--
-- Name: recibo_cobro_detalles uq_recibo_cxc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibo_cobro_detalles
    ADD CONSTRAINT uq_recibo_cxc UNIQUE (recibo_id, cxc_id);


--
-- Name: tipos_documentos uq_sucursal_codigo_doc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_documentos
    ADD CONSTRAINT uq_sucursal_codigo_doc UNIQUE (sucursal_id, codigo);


--
-- Name: usuario_permisos usuario_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_pkey PRIMARY KEY (usuario_id, permiso_id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- Name: vendedores vendedores_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendedores
    ADD CONSTRAINT vendedores_codigo_key UNIQUE (codigo);


--
-- Name: vendedores vendedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendedores
    ADD CONSTRAINT vendedores_pkey PRIMARY KEY (id);


--
-- Name: idx_clientes_contribuyente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_contribuyente ON public.clientes USING btree (contribuyente_especial) WHERE (contribuyente_especial = true);


--
-- Name: idx_costos_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_costos_producto ON public.producto_costos USING btree (producto_id, activo);


--
-- Name: idx_cuentas_cobrar_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cuentas_cobrar_status ON public.cuentas_cobrar USING btree (status);


--
-- Name: idx_cxc_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cxc_cliente ON public.cuentas_cobrar USING btree (cliente_id, status);


--
-- Name: idx_cxc_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cxc_factura ON public.cuentas_cobrar USING btree (factura_id);


--
-- Name: idx_cxp_proveedor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cxp_proveedor ON public.cuentas_pagar USING btree (proveedor_id, status);


--
-- Name: idx_dev_detalles_devolucion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dev_detalles_devolucion ON public.devolucion_venta_detalles USING btree (devolucion_id);


--
-- Name: idx_dev_detalles_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dev_detalles_producto ON public.devolucion_venta_detalles USING btree (producto_id);


--
-- Name: idx_documentos_preliminares_tipo_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_preliminares_tipo_fecha ON public.documentos_preliminares USING btree (tipo, actualizado_en DESC);


--
-- Name: idx_fac_compras_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fac_compras_fecha ON public.facturas_compras USING btree (fecha_emision, status);


--
-- Name: idx_fac_ventas_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fac_ventas_fecha ON public.facturas_ventas USING btree (fecha_emision, status);


--
-- Name: idx_fac_ventas_retencion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fac_ventas_retencion ON public.facturas_ventas USING btree (aplica_retencion_iva, fecha_emision);


--
-- Name: idx_factura_detalles_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_detalles_factura ON public.factura_venta_detalles USING btree (factura_id);


--
-- Name: idx_factura_detalles_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_detalles_producto ON public.factura_venta_detalles USING btree (producto_id);


--
-- Name: idx_factura_vendedores_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_vendedores_factura ON public.factura_vendedores USING btree (factura_id);


--
-- Name: idx_factura_vendedores_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_vendedores_usuario ON public.factura_vendedores USING btree (usuario_id);


--
-- Name: idx_factura_vendedores_vendedor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_vendedores_vendedor ON public.factura_vendedores USING btree (vendedor_id);


--
-- Name: idx_factura_venta_detalles_deposito_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_venta_detalles_deposito_id ON public.factura_venta_detalles USING btree (deposito_id);


--
-- Name: idx_factura_venta_detalles_factura_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_venta_detalles_factura_id ON public.factura_venta_detalles USING btree (factura_id);


--
-- Name: idx_factura_venta_detalles_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_venta_detalles_producto_id ON public.factura_venta_detalles USING btree (producto_id);


--
-- Name: idx_facturas_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_cliente ON public.facturas_ventas USING btree (cliente_id, fecha_emision);


--
-- Name: idx_facturas_ventas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_ventas_status ON public.facturas_ventas USING btree (status);


--
-- Name: idx_facturas_ventas_sucursal_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_ventas_sucursal_fecha ON public.facturas_ventas USING btree (sucursal_id, fecha_emision);


--
-- Name: idx_inv_reglas_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_reglas_producto ON public.inv_reglas_transformacion USING btree (producto_id);


--
-- Name: idx_inv_transf_sucursal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_transf_sucursal ON public.inv_transformaciones USING btree (sucursal_id, creado_en DESC);


--
-- Name: idx_inv_transf_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_transf_usuario ON public.inv_transformaciones USING btree (usuario_id);


--
-- Name: idx_inventario_stock_deposito_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_stock_deposito_id ON public.inventario_stock USING btree (deposito_id);


--
-- Name: idx_inventario_stock_producto_deposito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_stock_producto_deposito ON public.inventario_stock USING btree (producto_id, deposito_id);


--
-- Name: idx_inventario_stock_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_stock_producto_id ON public.inventario_stock USING btree (producto_id);


--
-- Name: idx_movimientos_documento_origen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_documento_origen ON public.inventario_movimientos USING btree (documento_origen);


--
-- Name: idx_movimientos_movimiento_origen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_movimiento_origen_id ON public.inventario_movimientos USING btree (movimiento_origen_id);


--
-- Name: idx_pagos_forma_pago; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_forma_pago ON public.pagos_proveedores USING btree (forma_pago, aplica_igtf);


--
-- Name: idx_precios_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_precios_producto ON public.producto_precios USING btree (producto_id, nivel_precio_id, activo);


--
-- Name: idx_productos_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_productos_categoria ON public.productos USING btree (categoria_id);


--
-- Name: idx_productos_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_productos_codigo ON public.productos USING btree (codigo);


--
-- Name: idx_proveedores_rif; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedores_rif ON public.proveedores USING btree (rif);


--
-- Name: idx_recibos_forma_pago; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recibos_forma_pago ON public.recibos_cobro USING btree (forma_pago, aplica_igtf);


--
-- Name: idx_seriales_buscar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seriales_buscar ON public.seriales USING btree (numero_serial, producto_id);


--
-- Name: idx_stock_deposito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_deposito ON public.inventario_stock USING btree (deposito_id);


--
-- Name: idx_stock_producto_deposito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_producto_deposito ON public.inventario_stock USING btree (producto_id, deposito_id);


--
-- Name: idx_usuario_permisos_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_permisos_usuario ON public.usuario_permisos USING btree (usuario_id);


--
-- Name: uq_stock_con_lote; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_stock_con_lote ON public.inventario_stock USING btree (producto_id, deposito_id, lote_id) WHERE (lote_id IS NOT NULL);


--
-- Name: uq_stock_sin_lote; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_stock_sin_lote ON public.inventario_stock USING btree (producto_id, deposito_id) WHERE (lote_id IS NULL);


--
-- Name: producto_costos trg_actualizar_costo_cache; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_actualizar_costo_cache AFTER INSERT OR UPDATE ON public.producto_costos FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_costo_producto_cache();


--
-- Name: producto_precios trg_actualizar_precio_cache; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_actualizar_precio_cache AFTER INSERT OR UPDATE ON public.producto_precios FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_precio_producto_cache();


--
-- Name: factura_compra_detalles trg_compra_detalle_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_compra_detalle_stock AFTER INSERT ON public.factura_compra_detalles FOR EACH ROW EXECUTE FUNCTION public.fn_trg_compra_actualizar_stock();


--
-- Name: facturas_ventas trg_factura_anulada_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_factura_anulada_stock AFTER UPDATE OF status ON public.facturas_ventas FOR EACH ROW EXECUTE FUNCTION public.fn_trg_factura_anulada_restaurar_stock();


--
-- Name: devoluciones_ventas trg_generar_cxc_devolucion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generar_cxc_devolucion AFTER INSERT ON public.devoluciones_ventas FOR EACH ROW EXECUTE FUNCTION public.generar_cxc_desde_devolucion();


--
-- Name: facturas_ventas trg_generar_cxc_factura; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generar_cxc_factura AFTER INSERT ON public.facturas_ventas FOR EACH ROW EXECUTE FUNCTION public.generar_cxc_desde_factura();


--
-- Name: devolucion_venta_detalles trg_inv_devolucion_venta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inv_devolucion_venta AFTER INSERT ON public.devolucion_venta_detalles FOR EACH ROW EXECUTE FUNCTION public.procesar_inventario_devolucion_venta();


--
-- Name: factura_venta_detalles trg_inv_factura_venta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inv_factura_venta AFTER INSERT ON public.factura_venta_detalles FOR EACH ROW EXECUTE FUNCTION public.procesar_inventario_factura_venta();


--
-- Name: inventario_movimiento_detalles trg_inv_movimientos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inv_movimientos AFTER INSERT ON public.inventario_movimiento_detalles FOR EACH ROW EXECUTE FUNCTION public.procesar_inventario_movimiento();


--
-- Name: recibo_cobro_detalles trg_recibo_detalle_aplicar; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recibo_detalle_aplicar AFTER INSERT ON public.recibo_cobro_detalles FOR EACH ROW EXECUTE FUNCTION public.fn_trg_recibo_aplicar_cobro();


--
-- Name: documentos_preliminares documentos_preliminares_sucursal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_preliminares
    ADD CONSTRAINT documentos_preliminares_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id);


--
-- Name: documentos_preliminares documentos_preliminares_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_preliminares
    ADD CONSTRAINT documentos_preliminares_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: factura_vendedores factura_vendedores_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_vendedores
    ADD CONSTRAINT factura_vendedores_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas_ventas(id) ON DELETE CASCADE;


--
-- Name: factura_vendedores factura_vendedores_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_vendedores
    ADD CONSTRAINT factura_vendedores_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: factura_vendedores factura_vendedores_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_vendedores
    ADD CONSTRAINT factura_vendedores_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id) ON DELETE SET NULL;


--
-- Name: facturas_ventas facturas_ventas_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_ventas
    ADD CONSTRAINT facturas_ventas_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id) ON DELETE SET NULL;


--
-- Name: facturas_ventas facturas_ventas_vendedor_secundario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_ventas
    ADD CONSTRAINT facturas_ventas_vendedor_secundario_id_fkey FOREIGN KEY (vendedor_secundario_id) REFERENCES public.vendedores(id) ON DELETE SET NULL;


--
-- Name: categoria_precios fk_catprecio_categoria; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria_precios
    ADD CONSTRAINT fk_catprecio_categoria FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE CASCADE;


--
-- Name: categoria_precios fk_catprecio_nivel; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria_precios
    ADD CONSTRAINT fk_catprecio_nivel FOREIGN KEY (nivel_precio_id) REFERENCES public.niveles_precio(id) ON DELETE CASCADE;


--
-- Name: factura_compra_detalles fk_compdet_compra; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_compra_detalles
    ADD CONSTRAINT fk_compdet_compra FOREIGN KEY (compra_id) REFERENCES public.facturas_compras(id) ON DELETE CASCADE;


--
-- Name: factura_compra_detalles fk_compdet_deposito; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_compra_detalles
    ADD CONSTRAINT fk_compdet_deposito FOREIGN KEY (deposito_id) REFERENCES public.depositos(id) ON DELETE RESTRICT;


--
-- Name: factura_compra_detalles fk_compdet_lote; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_compra_detalles
    ADD CONSTRAINT fk_compdet_lote FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE RESTRICT;


--
-- Name: factura_compra_detalles fk_compdet_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_compra_detalles
    ADD CONSTRAINT fk_compdet_producto FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT;


--
-- Name: producto_costos fk_costo_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_costos
    ADD CONSTRAINT fk_costo_moneda FOREIGN KEY (moneda_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: producto_costos fk_costo_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_costos
    ADD CONSTRAINT fk_costo_producto FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: cuentas_bancarias fk_cuenta_banco; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_bancarias
    ADD CONSTRAINT fk_cuenta_banco FOREIGN KEY (banco_id) REFERENCES public.bancos(id) ON DELETE RESTRICT;


--
-- Name: cuentas_bancarias fk_cuenta_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_bancarias
    ADD CONSTRAINT fk_cuenta_moneda FOREIGN KEY (moneda_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: cuentas_cobrar fk_cxc_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_cobrar
    ADD CONSTRAINT fk_cxc_cliente FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;


--
-- Name: cuentas_cobrar fk_cxc_devolucion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_cobrar
    ADD CONSTRAINT fk_cxc_devolucion FOREIGN KEY (devolucion_id) REFERENCES public.devoluciones_ventas(id) ON DELETE SET NULL;


--
-- Name: cuentas_cobrar fk_cxc_factura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_cobrar
    ADD CONSTRAINT fk_cxc_factura FOREIGN KEY (factura_id) REFERENCES public.facturas_ventas(id) ON DELETE SET NULL;


--
-- Name: cuentas_cobrar fk_cxc_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_cobrar
    ADD CONSTRAINT fk_cxc_moneda FOREIGN KEY (moneda_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: cuentas_pagar fk_cxp_compra; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_pagar
    ADD CONSTRAINT fk_cxp_compra FOREIGN KEY (compra_id) REFERENCES public.facturas_compras(id) ON DELETE SET NULL;


--
-- Name: cuentas_pagar fk_cxp_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_pagar
    ADD CONSTRAINT fk_cxp_moneda FOREIGN KEY (moneda_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: cuentas_pagar fk_cxp_proveedor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_pagar
    ADD CONSTRAINT fk_cxp_proveedor FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id) ON DELETE RESTRICT;


--
-- Name: depositos fk_deposito_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depositos
    ADD CONSTRAINT fk_deposito_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE RESTRICT;


--
-- Name: devolucion_venta_detalles fk_devdet_deposito; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_venta_detalles
    ADD CONSTRAINT fk_devdet_deposito FOREIGN KEY (deposito_id) REFERENCES public.depositos(id) ON DELETE RESTRICT;


--
-- Name: devolucion_venta_detalles fk_devdet_devolucion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_venta_detalles
    ADD CONSTRAINT fk_devdet_devolucion FOREIGN KEY (devolucion_id) REFERENCES public.devoluciones_ventas(id) ON DELETE CASCADE;


--
-- Name: devolucion_venta_detalles fk_devdet_lote; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_venta_detalles
    ADD CONSTRAINT fk_devdet_lote FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE RESTRICT;


--
-- Name: devolucion_venta_detalles fk_devdet_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_venta_detalles
    ADD CONSTRAINT fk_devdet_producto FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT;


--
-- Name: devoluciones_ventas fk_devventa_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_ventas
    ADD CONSTRAINT fk_devventa_cliente FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;


--
-- Name: devoluciones_ventas fk_devventa_factura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_ventas
    ADD CONSTRAINT fk_devventa_factura FOREIGN KEY (factura_id) REFERENCES public.facturas_ventas(id) ON DELETE RESTRICT;


--
-- Name: devoluciones_ventas fk_devventa_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_ventas
    ADD CONSTRAINT fk_devventa_moneda FOREIGN KEY (moneda_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: devoluciones_ventas fk_devventa_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_ventas
    ADD CONSTRAINT fk_devventa_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE RESTRICT;


--
-- Name: devoluciones_ventas fk_devventa_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_ventas
    ADD CONSTRAINT fk_devventa_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: facturas_compras fk_faccompra_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_compras
    ADD CONSTRAINT fk_faccompra_moneda FOREIGN KEY (moneda_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: facturas_compras fk_faccompra_proveedor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_compras
    ADD CONSTRAINT fk_faccompra_proveedor FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id) ON DELETE RESTRICT;


--
-- Name: facturas_compras fk_faccompra_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_compras
    ADD CONSTRAINT fk_faccompra_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE RESTRICT;


--
-- Name: facturas_compras fk_faccompra_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_compras
    ADD CONSTRAINT fk_faccompra_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: factura_venta_detalles fk_facdet_deposito; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_venta_detalles
    ADD CONSTRAINT fk_facdet_deposito FOREIGN KEY (deposito_id) REFERENCES public.depositos(id) ON DELETE RESTRICT;


--
-- Name: factura_venta_detalles fk_facdet_factura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_venta_detalles
    ADD CONSTRAINT fk_facdet_factura FOREIGN KEY (factura_id) REFERENCES public.facturas_ventas(id) ON DELETE CASCADE;


--
-- Name: factura_venta_detalles fk_facdet_lote; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_venta_detalles
    ADD CONSTRAINT fk_facdet_lote FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE RESTRICT;


--
-- Name: factura_venta_detalles fk_facdet_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura_venta_detalles
    ADD CONSTRAINT fk_facdet_producto FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT;


--
-- Name: facturas_ventas fk_facventa_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_ventas
    ADD CONSTRAINT fk_facventa_cliente FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;


--
-- Name: facturas_ventas fk_facventa_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_ventas
    ADD CONSTRAINT fk_facventa_moneda FOREIGN KEY (moneda_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: facturas_ventas fk_facventa_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_ventas
    ADD CONSTRAINT fk_facventa_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE RESTRICT;


--
-- Name: facturas_ventas fk_facventa_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_ventas
    ADD CONSTRAINT fk_facventa_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: lotes fk_lote_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT fk_lote_producto FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: metodos_pago fk_metodo_pago_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT fk_metodo_pago_moneda FOREIGN KEY (moneda_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: inventario_movimientos fk_mov_dep_destino; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT fk_mov_dep_destino FOREIGN KEY (deposito_destino_id) REFERENCES public.depositos(id) ON DELETE RESTRICT;


--
-- Name: inventario_movimientos fk_mov_dep_origen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT fk_mov_dep_origen FOREIGN KEY (deposito_origen_id) REFERENCES public.depositos(id) ON DELETE RESTRICT;


--
-- Name: inventario_movimientos fk_mov_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT fk_mov_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE RESTRICT;


--
-- Name: inventario_movimientos fk_mov_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT fk_mov_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: inventario_movimiento_detalles fk_movdet_lote; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimiento_detalles
    ADD CONSTRAINT fk_movdet_lote FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE RESTRICT;


--
-- Name: inventario_movimiento_detalles fk_movdet_movimiento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimiento_detalles
    ADD CONSTRAINT fk_movdet_movimiento FOREIGN KEY (movimiento_id) REFERENCES public.inventario_movimientos(id) ON DELETE CASCADE;


--
-- Name: inventario_movimiento_detalles fk_movdet_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimiento_detalles
    ADD CONSTRAINT fk_movdet_producto FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT;


--
-- Name: pago_proveedor_detalles fk_pagdet_cxp; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago_proveedor_detalles
    ADD CONSTRAINT fk_pagdet_cxp FOREIGN KEY (cxp_id) REFERENCES public.cuentas_pagar(id) ON DELETE RESTRICT;


--
-- Name: pago_proveedor_detalles fk_pagdet_pago; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago_proveedor_detalles
    ADD CONSTRAINT fk_pagdet_pago FOREIGN KEY (pago_id) REFERENCES public.pagos_proveedores(id) ON DELETE CASCADE;


--
-- Name: pagos_proveedores fk_pago_cuenta; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_proveedores
    ADD CONSTRAINT fk_pago_cuenta FOREIGN KEY (cuenta_bancaria_id) REFERENCES public.cuentas_bancarias(id) ON DELETE RESTRICT;


--
-- Name: pagos_proveedores fk_pago_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_proveedores
    ADD CONSTRAINT fk_pago_moneda FOREIGN KEY (moneda_pago_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: pagos_proveedores fk_pago_proveedor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_proveedores
    ADD CONSTRAINT fk_pago_proveedor FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id) ON DELETE RESTRICT;


--
-- Name: pagos_proveedores fk_pago_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_proveedores
    ADD CONSTRAINT fk_pago_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE RESTRICT;


--
-- Name: pagos_proveedores fk_pago_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_proveedores
    ADD CONSTRAINT fk_pago_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: pagos_proveedores fk_pagos_metodo_pago; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_proveedores
    ADD CONSTRAINT fk_pagos_metodo_pago FOREIGN KEY (metodo_pago_id) REFERENCES public.metodos_pago(id) ON DELETE RESTRICT;


--
-- Name: producto_precios fk_precio_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_precios
    ADD CONSTRAINT fk_precio_moneda FOREIGN KEY (moneda_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: producto_precios fk_precio_nivel; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_precios
    ADD CONSTRAINT fk_precio_nivel FOREIGN KEY (nivel_precio_id) REFERENCES public.niveles_precio(id) ON DELETE RESTRICT;


--
-- Name: producto_precios fk_precio_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_precios
    ADD CONSTRAINT fk_precio_producto FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: productos fk_producto_categoria; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT fk_producto_categoria FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE RESTRICT;


--
-- Name: productos fk_producto_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT fk_producto_moneda FOREIGN KEY (moneda_base_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: proveedores fk_proveedor_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT fk_proveedor_moneda FOREIGN KEY (moneda_cuenta_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: recibo_cobro_detalles fk_recdet_cxc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibo_cobro_detalles
    ADD CONSTRAINT fk_recdet_cxc FOREIGN KEY (cxc_id) REFERENCES public.cuentas_cobrar(id) ON DELETE RESTRICT;


--
-- Name: recibo_cobro_detalles fk_recdet_recibo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibo_cobro_detalles
    ADD CONSTRAINT fk_recdet_recibo FOREIGN KEY (recibo_id) REFERENCES public.recibos_cobro(id) ON DELETE CASCADE;


--
-- Name: recibos_cobro fk_recibo_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibos_cobro
    ADD CONSTRAINT fk_recibo_cliente FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;


--
-- Name: recibos_cobro fk_recibo_cuenta; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibos_cobro
    ADD CONSTRAINT fk_recibo_cuenta FOREIGN KEY (cuenta_bancaria_id) REFERENCES public.cuentas_bancarias(id) ON DELETE RESTRICT;


--
-- Name: recibos_cobro fk_recibo_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibos_cobro
    ADD CONSTRAINT fk_recibo_moneda FOREIGN KEY (moneda_pago_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: recibos_cobro fk_recibo_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibos_cobro
    ADD CONSTRAINT fk_recibo_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE RESTRICT;


--
-- Name: recibos_cobro fk_recibo_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibos_cobro
    ADD CONSTRAINT fk_recibo_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: recibos_cobro fk_recibos_metodo_pago; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recibos_cobro
    ADD CONSTRAINT fk_recibos_metodo_pago FOREIGN KEY (metodo_pago_id) REFERENCES public.metodos_pago(id) ON DELETE RESTRICT;


--
-- Name: rol_permisos fk_rolpermiso_permiso; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT fk_rolpermiso_permiso FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON DELETE CASCADE;


--
-- Name: rol_permisos fk_rolpermiso_rol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT fk_rolpermiso_rol FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: seriales fk_serial_deposito; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seriales
    ADD CONSTRAINT fk_serial_deposito FOREIGN KEY (deposito_id) REFERENCES public.depositos(id) ON DELETE RESTRICT;


--
-- Name: seriales fk_serial_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seriales
    ADD CONSTRAINT fk_serial_producto FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: inventario_stock fk_stock_deposito; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_stock
    ADD CONSTRAINT fk_stock_deposito FOREIGN KEY (deposito_id) REFERENCES public.depositos(id) ON DELETE RESTRICT;


--
-- Name: inventario_stock fk_stock_lote; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_stock
    ADD CONSTRAINT fk_stock_lote FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE RESTRICT;


--
-- Name: inventario_stock fk_stock_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_stock
    ADD CONSTRAINT fk_stock_producto FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: sucursales fk_sucursal_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT fk_sucursal_empresa FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: tasas_cambio fk_tasa_moneda; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasas_cambio
    ADD CONSTRAINT fk_tasa_moneda FOREIGN KEY (moneda_id) REFERENCES public.monedas(id) ON DELETE RESTRICT;


--
-- Name: tasas_cambio fk_tasa_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasas_cambio
    ADD CONSTRAINT fk_tasa_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: tipos_documentos fk_tipodoc_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_documentos
    ADD CONSTRAINT fk_tipodoc_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE RESTRICT;


--
-- Name: usuarios fk_usuario_rol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- Name: usuarios fk_usuario_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuario_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE SET NULL;


--
-- Name: impresoras_sucursal impresoras_sucursal_sucursal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impresoras_sucursal
    ADD CONSTRAINT impresoras_sucursal_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE CASCADE;


--
-- Name: inv_reglas_transformacion inv_reglas_transformacion_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_reglas_transformacion
    ADD CONSTRAINT inv_reglas_transformacion_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: inv_transformaciones inv_transformaciones_deposito_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_transformaciones
    ADD CONSTRAINT inv_transformaciones_deposito_destino_id_fkey FOREIGN KEY (deposito_destino_id) REFERENCES public.depositos(id);


--
-- Name: inv_transformaciones inv_transformaciones_deposito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_transformaciones
    ADD CONSTRAINT inv_transformaciones_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES public.depositos(id);


--
-- Name: inv_transformaciones inv_transformaciones_deposito_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_transformaciones
    ADD CONSTRAINT inv_transformaciones_deposito_origen_id_fkey FOREIGN KEY (deposito_origen_id) REFERENCES public.depositos(id);


--
-- Name: inv_transformaciones inv_transformaciones_movimiento_cargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_transformaciones
    ADD CONSTRAINT inv_transformaciones_movimiento_cargo_id_fkey FOREIGN KEY (movimiento_cargo_id) REFERENCES public.inventario_movimientos(id);


--
-- Name: inv_transformaciones inv_transformaciones_movimiento_descargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_transformaciones
    ADD CONSTRAINT inv_transformaciones_movimiento_descargo_id_fkey FOREIGN KEY (movimiento_descargo_id) REFERENCES public.inventario_movimientos(id);


--
-- Name: inv_transformaciones inv_transformaciones_producto_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_transformaciones
    ADD CONSTRAINT inv_transformaciones_producto_origen_id_fkey FOREIGN KEY (producto_origen_id) REFERENCES public.productos(id);


--
-- Name: inv_transformaciones inv_transformaciones_sucursal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_transformaciones
    ADD CONSTRAINT inv_transformaciones_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id);


--
-- Name: inv_transformaciones inv_transformaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_transformaciones
    ADD CONSTRAINT inv_transformaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: inventario_movimientos inventario_movimientos_movimiento_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT inventario_movimientos_movimiento_origen_id_fkey FOREIGN KEY (movimiento_origen_id) REFERENCES public.inventario_movimientos(id) ON DELETE SET NULL;


--
-- Name: productos productos_actualizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.usuarios(id);


--
-- Name: productos productos_moneda_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_moneda_venta_id_fkey FOREIGN KEY (moneda_venta_id) REFERENCES public.monedas(id);


--
-- Name: usuario_permisos usuario_permisos_permiso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON DELETE CASCADE;


--
-- Name: usuario_permisos usuario_permisos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: vendedores vendedores_sucursal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendedores
    ADD CONSTRAINT vendedores_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


