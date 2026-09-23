# 📋 Especificación Integral y Guía de Desarrollo Frontend (ERP Business)

**Proyecto:** ERP Business — Sistema ERP Administrativo y Punto de Venta  
**Stack Frontend:** Vue 3 (Composition API / `<script setup>`), TypeScript, Pinia, Vue Router 4, Vue I18n, Tailwind CSS, Axios.  
**Versión del Documento:** 3.1 (Maestro Consolidado)  
**Fecha:** 2026-08-27  

---

## 📑 Tabla de Contenido
1. [Visión General y Arquitectura del Frontend](#1-visión-general-y-arquitectura-del-frontend)
2. [Estructura de Navegación y Menú ERP](#2-estructura-de-navegación-y-menú-erp)
3. [Módulos y Requerimientos Funcionales Detallados](#3-módulos-y-requerimientos-funcionales-detallados)
   - [3.1 Autenticación y Control de Accesos (RBAC)](#31-autenticación-y-control-de-accesos-rbac)
   - [3.2 Módulo de Ventas y Facturación](#32-módulo-de-ventas-y-facturación)
   - [3.3 Módulo de Devoluciones (Notas de Crédito)](#33-módulo-de-devoluciones-notas-de-crédito)
   - [3.4 Módulo de Documentos Preliminares (Borradores/Presupuestos)](#34-módulo-de-documentos-preliminares-borradorespresupuestos)
   - [3.5 Módulo de Compras a Proveedores](#35-módulo-de-compras-a-proveedores)
   - [3.6 Módulo de Inventario, Almacenes y Correlativos](#36-módulo-de-inventario-almacenes-y-correlativos)
   - [3.7 Módulo de Cuentas por Cobrar y Recibos de Cobro](#37-módulo-de-cuentas-por-cobrar-y-recibos-de-cobro)
   - [3.8 Módulo de Cuentas por Pagar y Pagos a Proveedores](#38-módulo-de-cuentas-por-pagar-y-pagos-a-proveedores)
   - [3.9 Módulo de Comandas de Corte](#39-módulo-de-comandas-de-corte)
   - [3.10 Módulo de Anulaciones (Individual y por Lote)](#310-módulo-de-anulaciones-individual-y-por-lote)
   - [3.11 Mantenimiento y Catálogos Maestros](#311-mantenimiento-y-catálogos-maestros)
   - [3.12 Sistema, Configuración y Parámetros Fiscales](#312-sistema-configuración-y-parámetros-fiscales)
   - [3.13 Informes y Reportes](#313-informes-y-reportes)
4. [Reglas de Negocio Clave y Manejo de Errores](#4-reglas-de-negocio-clave-y-manejo-de-errores)
5. [Matriz de Permisos (`clave_permiso`) y Rutas](#5-matriz-de-permisos-clave_permiso-y-rutas)
6. [Checklist de Tareas Pendientes para el Desarrollador Frontend](#6-checklist-de-tareas-pendientes-para-el-desarrollador-frontend)

---

## 1. Visión General y Arquitectura del Frontend

El frontend de **ERP Business** es una SPA empresarial diseñada para operar de forma ágil tanto en mostradores de facturación y puntos de venta de alto tráfico como en la administración centralizada de inventarios, compras, cuentas por cobrar/pagar y tesorería.

### Principios Arquitectónicos
- **Modularidad por Dominio (`src/modules/*`):** Cada módulo agrupa sus componentes, vistas (`views`), almacén de estado (`*.store.ts`), tipos/interfaces (`*.types.ts`), mappers (`*.mapper.ts`) y servicios de API.
- **Estado Centralizado (Pinia):** Manejo reactivo de sesión, permisos, carrito de ventas, tasas de cambio y catálogos maestros en memoria.
- **Protección de Rutas por RBAC:** Validación síncrona en `router.beforeEach` mediante `authStore.hasPermission(permission)`.
- **Multimoneda Dual Dinámica:** Conversión en tiempo real entre Divisas (USD u otras) y Moneda Base (VES - Bolívares) aplicando la tasa oficial del día e impuestos asociados (IVA / IGTF).
- **Internacionalización (Vue I18n):** Soporte bilingüe (`es` / `en`) con catálogo de traducciones unificado.

---

## 2. Estructura de Navegación y Menú ERP

La navegación se rige bajo la arquitectura estándar de ERPs administrativos (estilo Saint Enterprise / Profit Plus / Premium Soft), organizada en 6 grandes áreas jerárquicas:

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│  Mantenimiento  │  Transacciones  │  Ventas  │  Compras  │  Informes  │  Sistema (Config)  │
└────────────────────────────────────────────────────────────────────────────────────────────┘

📁 1. MANTENIMIENTO (Catálogos y Datos Base)
├── 📦 Inventario / Artículos
│   ├── Departamentos / Categorías (/inventory/categories)
│   ├── Depósitos / Almacenes (/inventory/warehouses)
│   └── Inventario / Productos (/inventory/products)
├── 👥 Ventas y Clientes
│   ├── Clientes (/customers)
│   ├── Vendedores (/master/vendedores)
│   └── Métodos de Pago (/master/metodos-pago)
├── 🏢 Proveedores y Monedas
│   ├── Proveedores (/master/proveedores)
│   └── Monedas (/currencies)
└── 🏦 Bancos
    ├── Bancos (/master/bancos)
    └── Cuentas Bancarias (/master/cuentas-bancarias)

📁 2. TRANSACCIONES (Operaciones del Día a Día)
├── 📦 Inventario >
│   ├── Transferencias entre Almacenes (/inventory/transfers)
│   ├── Ajuste de Existencia (/inventory/control)  ⚠️ (Renombrado de "Control de Inventario")
│   ├── Ajuste de Precios (/inventory/prices)
│   ├── Manejo de Seriales (/inventory/seriales)
│   └── Manejo de Lotes (/inventory/lotes)
├── 👥 Clientes (Cuentas por Cobrar) >
│   ├── Cuentas por Cobrar (CxC)
│   ├── Recibos de Cobro (/recibos-cobro)
│   └── Comandas de Corte (/corte/comandas)
├── 🏢 Proveedores (Cuentas por Pagar) >
│   ├── Cuentas por Pagar (CxP) (/cuentas-pagar)
│   └── Pagos a Proveedores (/pagos-proveedores)
└── 🗑️ Anulación de Documentos (/anulaciones)  ✨ (Individual y por Lote)

📁 3. VENTAS (Comercialización)
├── ➕ Nueva Factura (/invoices/create)
├── 📋 Listado de Facturas (/invoices)
├── ↩️ Devoluciones de Venta (/returns)
└── 📝 Documentos Preliminares (Borradores/Presupuestos)

📁 4. COMPRAS (Abastecimiento)
├── ➕ Registro de Factura de Compra (/compras/create)
└── 📋 Listado de Compras (/compras)

📁 5. INFORMES (Reportes Gerenciales)
└── 📊 Reportes Generales (/master/reports)

📁 6. SISTEMA / CONFIGURACIÓN
├── 💱 Tasas de Cambio (/exchange-rates)
├── 💵 IGTF (/igtf)
├── 📄 Tipos de Documentos y Correlativos (/master/tipos-documentos)
├── ⚙️ Parámetros Fiscales y del Sistema (/master/parametros)
├── 👤 Usuarios (/master/usuarios)
├── 🛡️ Roles y Permisos (/master/roles)
├── 🏢 Empresas (/master/empresas)
├── 🏬 Sucursales (/master/sucursales)
└── 🖨️ Impresoras de Sucursal (/master/impresoras)
```

---

## 3. Módulos y Requerimientos Funcionales Detallados

### 3.1 Autenticación y Control de Accesos (RBAC)
- **Login (`/login`):**
  - Autenticación por `username` y `password`.
  - Guardado seguro del token JWT en `localStorage`.
  - Carga automática del perfil del usuario, sucursal asignada (`sucursal_id`), rol (`rol_id`) y listado de claves de permiso (`permisos: string[]`).
- **Control de Rutas y Elementos Visuales:**
  - `router.beforeEach`: Redirección a `/403` si no posee el permiso requerido.
  - Directiva o helper `hasPermission('clave')` para ocultar botones de acción (Crear, Editar, Eliminar, Anular, Venta sin Stock).
  - Scope de Sucursal: Identificar si el usuario tiene `general.viewAllLocations`. Si no lo tiene, los selectores de sucursal se bloquean fijando su sede actual.

---

### 3.2 Módulo de Ventas y Facturación
- **Creación de Factura (`/invoices/create`):**
  - **Selector de Cliente:** Búsqueda rápida por documento (Cédula/RIF) o nombre; modal para crear cliente express en caliente.
  - **Condición de Pago:** Contado (`CASH`) o Crédito (`CREDIT`) con definición de días de crédito y fecha de vencimiento.
  - **Grid de Productos / Carrito:**
    - Búsqueda por código de barras, SKU o descripción.
    - Manejo de niveles de precio (A, B, C, etc.).
    - Selección obligatoria de Lote y/o Seriales si el producto lo requiere.
    - Validación de stock en tiempo real con respecto al almacén de la sucursal seleccionada (salvo que tenga permiso `invoices.sellWithoutStock`).
    - Descuentos por línea y descuento global.
  - **Cálculo de Totales e Impuestos:**
    - Subtotal en moneda base (VES) y divisa (USD).
    - Cálculo automático de IVA según el porcentaje activo del producto / parámetro fiscal.
    - Cálculo de IGTF (3%) si el método de pago es en divisas / efectivo USD.
  - **Pasarela de Pagos Múltiples:**
    - División del pago en múltiples métodos: Efectivo Bs, Efectivo USD, Punto de Venta, Pago Móvil, Transferencia Bancaria, Zelle.
    - Validación de requerimiento de cuenta bancaria y número de referencia según el método.
    - Cálculo automático de vuelto / cambio en divisa o bolívares.
  - **Emisión e Impresión:**
    - Envío de factura a backend con correlativo fiscal asignado.
    - Impresión de ticket térmico / factura digital con formato fiscal o plantilla configurada en impresora de sucursal.
- **Listado de Facturas (`/invoices`):**
  - Filtros: Rango de fechas, cliente, sucursal, estado (`PAGADA`, `PENDIENTE`, `ANULADA`).
  - Ver detalle completo de factura, desglose de ítems, pagos recibidos y saldo pendiente de CxC vinculada.
  - Descarga e impresión de comprobante.

---

### 3.3 Módulo de Devoluciones (Notas de Crédito)
- **Rutas:** `/returns` (Listado) y `/returns/create` (Creación).
- **Funcionalidad:**
  - Búsqueda y selección de la Factura de Venta origen.
  - Selección de los ítems a devolver (cantidad parcial o total).
  - Motivo de devolución obligatorio.
  - Reingreso automático de productos al almacén/depósito correspondiente.
  - Generación de Nota de Crédito con correlativo fiscal y ajuste de saldo deudor del cliente.

---

### 3.4 Módulo de Documentos Preliminares (Borradores/Presupuestos)
- **Funcionalidad en Ventas y Transferencias:**
  - **Guardar Preliminar:** Permite guardar el estado actual del carrito sin afectar stock ni emitir correlativo fiscal.
  - **Cargar Preliminar:** Modal con lista de borradores pendientes (fecha, etiqueta, usuario, cantidad de ítems).
  - **Validación al Recargar:** Al abrir un preliminar, el frontend valida disponibilidad actual de stock, precios y tasa de cambio del día, alertando al usuario sobre variaciones.
  - **Eliminación:** Al emitirse la factura o transferencia definitiva, el frontend ejecuta `DELETE /preliminares/:id` automáticamente.
  - **Impresión de Presupuesto:** Comprobante con marca de agua/encabezado `PRELIMINAR` sin validez fiscal ni números de control.

---

### 3.5 Módulo de Compras a Proveedores
- **Registro de Factura de Compra (`/compras/create`):**
  - Selección de Proveedor (Razón social, RIF, teléfono).
  - Datos de cabecera: Número de factura del proveedor, número de control, fecha de emisión y vencimiento.
  - Detalle de compras:
    - Búsqueda de producto y asignación de costo unitario de compra.
    - Asignación de Lote de entrada (con fecha de vencimiento) y/o carga de Seriales ingresados.
    - Selección de Almacén de destino (`[CÓDIGO] Nombre`).
  - Condición de pago (Contado / Crédito). Generación automática de Cuenta por Pagar (CxP).
  - Afectación inmediata de inventario (aumento de existencia y actualización de costos promedio/último costo).
- **Listado de Compras (`/compras`):**
  - Histórico de recepciones de compra, visualización de comprobantes, estatus de pago y filtros por proveedor/sucursal.

---

### 3.6 Módulo de Inventario, Almacenes y Correlativos

#### Gestión de Almacenes / Depósitos (`/inventory/warehouses`)
- **Problema Detectado:** En la tabla `depositos` el campo `codigo: string` es obligatorio y único, pero no usa la tabla `tipos_documentos`. En los formularios se mostraba un input vacío sin sugerencia de correlativo.
- **Solución que debe implementar el Frontend:**
  1. **Autogeneración / Sugerencia de Correlativo en `WarehouseForm.vue`:**
     - Al seleccionar la sucursal, el frontend calcula el siguiente código secuencial disponible para esa sede (ej. `ALM-01`, `ALM-02`, etc.) y lo coloca por defecto si el campo está vacío.
     - Botón auxiliar *"Generar correlativo"* junto a la etiqueta del campo para regenerarlo a demanda.
  2. **Autocompletado de Almacén Inicial en `SucursalesCreateView.vue`:**
     - Al ingresar las `siglas` de una nueva sucursal (ej. `VAL`), autocompletar automáticamente el campo `initialWarehouse.codigo` con `${siglas}-ALM1` (ej. `VAL-ALM1`) y el nombre con `Almacén Principal ${nombre}`.
  3. **Visualización en Selectores:**
     - En todos los selectores de almacén (Ventas, Compras, Transferencias, Ajustes), mostrar el formato: `[{{ almacen.codigo }}] {{ almacen.name }}`.

#### Resto de Vistas de Inventario
- **Catálogo de Productos (`/inventory/products`):**
  - Alta, edición y baja lógica de productos.
  - Configuración de SKU, código de barras, nombre, categoría, unidad de medida.
  - Flags de control de stock: indicador de si maneja Seriales, Lotes o si es Servicio.
  - Tabla de precios por niveles (Precio 1, Precio 2, etc.) y monedas.
- **Categorías y Departamentos (`/inventory/categories`):**
  - Mantenimiento jerárquico de categorías.
- **Ajuste de Existencia (`/inventory/control`):**
  - ⚠️ *Título y etiquetas unificadas a "Ajuste de Existencia" ("Stock Adjustment")*.
  - Entradas/Cargos y Salidas/Descargos manuales con justificación obligatoria.
- **Ajuste de Precios (`/inventory/prices`):**
  - Actualización masiva o individual de listas de precios por categoría o margen.
- **Transferencias entre Almacenes (`/inventory/transfers`):**
  - Movimiento entre depósitos con selección de lotes/seriales específicos y emisión de nota de traslado.
- **Manejo de Seriales y Lotes (`/inventory/seriales`, `/inventory/lotes`):**
  - Consulta y rastreo del ciclo de vida de cada serial (Disponible, Vendido, Transferido, Anulado) y vencimiento de lotes.

---

### 3.7 Módulo de Cuentas por Cobrar y Recibos de Cobro
- **Listado de Recibos de Cobro (`/recibos-cobro`):**
  - Historial de cobros emitidos a clientes, montos cobrados, métodos de pago y cuentas afectadas.
- **Creación de Recibo de Cobro (`/recibos-cobro/create`):**
  - Selección de Cliente: Carga automática de todas sus facturas con saldo pendiente consumiendo `GET /recibos-cobro/cuentas-pendientes?cliente_id=X`.
  - Tabla de facturas pendientes con checkbox y monto a abonar (abono parcial o cancelación total).
  - Desglose de formas de pago recibidas (transferencia, efectivo, etc.).
  - Generación de comprobante de cobro y actualización del saldo pendiente de la CxC.

---

### 3.8 Módulo de Cuentas por Pagar y Pagos a Proveedores
- **Listado de Cuentas por Pagar (`/cuentas-pagar`):**
  - Monitoreo de facturas de compra pendientes de pago, días de vencimiento y estado de cuenta.
- **Pagos a Proveedores (`/pagos-proveedores`, `/pagos-proveedores/create`):**
  - Selección de proveedor y facturas de compra adeudadas.
  - Registro de egreso desde cuenta bancaria o caja.
  - Disminución del saldo deudor en CxP y emisión de orden de pago.

---

### 3.9 Módulo de Comandas de Corte
- **Vista de Comandas Pendientes (`/corte/comandas`):**
  - Módulo operativo para negocios con servicios de corte/despacho (vinilos, telas, materiales por metraje).
  - Lista de pedidos/comandas en estado `PENDIENTE`, `EN_PROCESO`, `COMPLETADO`.
  - Impresión de ticket de corte para operario de taller/almacén.
  - Notificación de cambio de estado para habilitar la facturación en caja.

---

### 3.10 Módulo de Anulaciones (Individual y por Lote)
- **Vista Principal (`/anulaciones`):**
  - Filtros avanzados: Tipo de Documento (`FACTURA_VENTA`, `FACTURA_COMPRA`, `DEVOLUCION_VENTA`, `RECIBO_COBRO`, `PAGO_PROVEEDOR`, `TRANSFERENCIA`), Rango de Fechas, Sucursal, Búsqueda de texto y toggle de solo activos.
- **Anulación Individual:**
  - Botón "Anular" por fila. Modal de confirmación exigiendo **Motivo de Anulación** (mínimo 3 caracteres).
  - Seguridad: Si el usuario actual no es Administrador Principal (`rolId !== 1`), el modal solicita la contraseña de un Administrador (`admin_password`).
- **Anulación por Lote:**
  - Checkboxes en el listado para selección múltiple de documentos del mismo o distinto tipo.
  - Barra flotante inferior indicando cantidad de documentos seleccionados y botón **"Anular Selección por Lote (N)"**.
  - Modal único de confirmación por lote con validación de contraseña de administrador y motivo general.
- **Efecto de la Reversión:**
  - Al anular una factura de venta/compra, se revierte el movimiento de inventario, se liberan seriales/lotes y se anulan las CxC/CxP vinculadas.
  - Al anular un recibo de cobro o pago a proveedor, se restaura el saldo pendiente en la CxC/CxP correspondiente.

---

### 3.11 Mantenimiento y Catálogos Maestros
- **Clientes (`/customers`):** CRUD completo, RIF/Cédula, dirección fiscal, teléfono, límite de crédito, días de crédito, nivel de precio preferencial.
- **Proveedores (`/master/proveedores`):** CRUD completo, RIF, contacto, términos comerciales.
- **Vendedores (`/master/vendedores`):** CRUD completo, asignación a sucursal, porcentaje de comisión sobre ventas.
- **Métodos de Pago (`/master/metodos-pago`):** Configuración de métodos aceptados (Efectivo, Tarjeta, Zelle, etc.) y flag de `requiere_cuenta_bancaria`.
- **Bancos y Cuentas Bancarias (`/master/bancos`, `/master/cuentas-bancarias`):** Catálogo de entidades financieras y registro de cuentas de la empresa con número de cuenta, moneda asociada y sucursal.
- **Empresas y Sucursales (`/master/empresas`, `/master/sucursales`):** Razón social, RIF, dirección fiscal, configuración de impresoras y depósitos por sucursal.

---

### 3.12 Sistema, Configuración y Parámetros Fiscales
- **Tasas de Cambio (`/exchange-rates`):**
  - Registro de tasa oficial (BCV) y tasas secundarias con historial cronológico.
  - Notificación de alerta visual si no se ha configurado la tasa del día.
- **IGTF (`/igtf`):**
  - Configuración del porcentaje de Impuesto a las Grandes Transacciones Financieras y cuentas contables asociadas.
- **Tipos de Documentos y Correlativos (`/master/tipos-documentos`):**
  - Configuración de códigos (`FAC`, `NC`, `COM`, `RC`, `TRA`), prefijos, número de control y correlativo actual por sucursal.
- **Parámetros Fiscales (`/master/parametros`):**
  - Configuración de alícuotas de IVA (General, Reducido, Adicional), datos fiscales de la empresa emisora.
- **Usuarios (`/master/usuarios`):**
  - Creación y edición de usuarios, asignación de sucursal, rol y reset de credenciales.
- **Roles y Permisos (`/master/roles`):**
  - Matriz visual jerárquica (`RolForm.vue` / `ModulePermissionNode.vue`) basada en el catálogo de módulos (`module-catalog.ts`).
  - Asignación de permisos granulares por módulo y acciones especiales (`invoices.sellWithoutStock`, `general.viewAllLocations`).
- **Impresoras de Sucursal (`/master/impresoras`):**
  - Configuración de impresoras térmicas (EPSON, Bixolon, Genéricas), tipo de conexión (Red/IP, USB, Serial) y asignación por estación/sucursal.

---

### 3.13 Informes y Reportes
- **Vista Central de Reportes (`/master/reports`):**
  - **Ventas:** Resumen diario de ventas, ventas por vendedor, ventas por categoría de producto, reporte de IGTF recaudado.
  - **Inventario:** Valorización de inventario por almacén, productos bajo stock mínimo, rotación de artículos, kardex / historial de movimientos.
  - **Cuentas por Cobrar (CxC):** Antigüedad de saldos deudores, cobranzas del mes por método de pago.
  - **Cuentas por Pagar (CxP):** Deudas por vencer y pagos realizados a proveedores.
  - Exportación de reportes a PDF y Excel / CSV.

---

## 4. Reglas de Negocio Clave y Manejo de Errores

1. **Gestión Multimoneda:**
   - La base de datos calcula montos en moneda base (`VES`) y divisa de referencia (`USD`). El frontend debe formatear adecuadamente con 2 decimales y símbolo respectivo.
2. **Validación de Stock Concurrente:**
   - El frontend debe capturar errores `400 Bad Request` por stock insuficiente y presentar un aviso claro al usuario indicando el producto y la existencia restante.
3. **Manejo de Impuestos Combinados:**
   - Monto Exento + Monto Base Imponible * %IVA.
   - Si el pago en divisas supera el umbral, se aplica IGTF sobre el monto cancelado en moneda extranjera.
4. **Scope de Sucursal Restringido:**
   - Todo usuario sin el permiso `general.viewAllLocations` solo puede visualizar y operar sobre los registros de su `sucursal_id` activa.
5. **Comportamiento Offline / Resiliencia:**
   - Bloqueo de botones de envío (Loading State) durante peticiones para evitar envíos duplicados de facturas o pagos.

---

## 5. Matriz de Permisos (`clave_permiso`) y Rutas

| Ruta Frontend | Nombre de Ruta | `clave_permiso` Requerida | Grupo en Menú ERP |
|---|---|---|---|
| `/dashboard` | `Dashboard` | *(Autenticado)* | Principal |
| `/invoices` | `InvoicesList` | `invoices` | Ventas |
| `/invoices/create` | `InvoiceCreate` | `invoices` | Ventas |
| *(Acción en Factura)* | N/A | `invoices.sellWithoutStock` | Ventas |
| `/returns` | `ReturnsList` | `returns` | Ventas |
| `/returns/create` | `ReturnCreate` | `returns` | Ventas |
| `/compras` | `ComprasList` | `compras` | Compras |
| `/compras/create` | `ComprasCreate` | `compras` | Compras |
| `/inventory` | `InventoryList` | `inventory.summary` | Mantenimiento -> Inventario |
| `/inventory/products` | `InventoryProductsList` | `inventory.products` | Mantenimiento -> Inventario |
| `/inventory/categories` | `InventoryCategoriesList` | `inventory.categories` | Mantenimiento -> Inventario |
| `/inventory/warehouses` | `InventoryWarehousesList` | `inventory.warehouses` | Mantenimiento -> Inventario |
| `/inventory/transfers` | `InventoryTransfersList` | `inventory.transfers` | Transacciones -> Inventario |
| `/inventory/control` | `InventoryControl` | `inventory.control` | Transacciones -> Inventario |
| `/inventory/prices` | `InventoryPrices` | `inventory.prices` | Transacciones -> Inventario |
| `/inventory/seriales` | `InventorySerialesList` | `inventory.seriales` | Transacciones -> Inventario |
| `/inventory/lotes` | `InventoryLotesList` | `inventory.lotes` | Transacciones -> Inventario |
| `/customers` | `CustomersList` | `customers` | Mantenimiento -> Clientes |
| `/recibos-cobro` | `RecibosCobroList` | `recibos.cobro` | Transacciones -> Clientes |
| `/recibos-cobro/create` | `RecibosCobroCreate` | `recibos.cobro` | Transacciones -> Clientes |
| `/corte/comandas` | `CorteComandas` | `corte` | Transacciones -> Clientes |
| `/cuentas-pagar` | `CuentasPagarList` | `cuentas.pagar` | Transacciones -> Proveedores |
| `/pagos-proveedores` | `PagosProveedoresList` | `pagos.proveedores` | Transacciones -> Proveedores |
| `/anulaciones` | `Anulaciones` | `transacciones.anulaciones` | Transacciones |
| `/master/proveedores` | `MasterProveedoresList` | `master.proveedores` | Mantenimiento -> Proveedores |
| `/currencies` | `Currencies` | `currencies` | Mantenimiento -> Monedas |
| `/master/bancos` | `MasterBancosList` | `master.bancos` | Mantenimiento -> Bancos |
| `/master/cuentas-bancarias` | `MasterCuentasBancariasList` | `master.cuentasBancarias` | Mantenimiento -> Bancos |
| `/master/vendedores` | `MasterVendedoresList` | `master.vendedores` | Mantenimiento -> Ventas |
| `/master/metodos-pago` | `MasterMetodosPagoList` | `configuracion.metodos_pago` | Mantenimiento -> Ventas |
| `/master/reports` | `MasterReports` | `master.informes` | Informes |
| `/exchange-rates` | `ExchangeRates` | `exchangeRates` | Sistema |
| `/igtf` | `IgtfSettings` | `igtf` | Sistema |
| `/master/tipos-documentos` | `MasterTiposDocumentosList` | `master.tiposDocumentos` | Sistema |
| `/master/parametros` | `MasterParametrosList` | `master.parametros` | Sistema |
| `/master/usuarios` | `MasterUsuariosList` | `master.usuarios` | Sistema |
| `/master/roles` | `MasterRolesList` | `master.roles` | Sistema |
| `/master/impresoras` | `MasterImpresorasList` | `master.impresoras` | Sistema |
| `/master/empresas` | `MasterEmpresasList` | `master.empresas` | Mantenimiento |
| `/master/sucursales` | `MasterSucursalesList` | `master.sucursales` | Mantenimiento |
| *(Global)* | N/A | `general.viewAllLocations` | Scope Global |

---

## 6. Checklist de Tareas Pendientes para el Desarrollador Frontend

- [ ] **1. Autogeneración de Correlativos en Almacenes:**
  - Agregar watcher en `WarehouseForm.vue` para sugerir automáticamente `ALM-01`, `ALM-02` según la sucursal.
  - Autocompletar `initialWarehouse.codigo` en `SucursalesCreateView.vue` a partir de las `siglas` de la sucursal (ej: `VAL-ALM1`).
  - Mostrar `[{{ codigo }}] {{ nombre }}` en todos los `<select>` de almacén del sistema.
- [ ] **2. Renombrar "Control de Inventario" a "Ajuste de Existencia":**
  - Unificar los textos en `src/locales/es.json` y `src/locales/en.json`.
  - Actualizar títulos y botones en `InventoryControlView.vue`.
- [ ] **3. Submenús Anidados en Navegación (Estilo ERP):**
  - Implementar en `DashboardLayout.vue` / `Sidebar.vue` el despliegue multinivel de 2do y 3er nivel (ej: `Transacciones -> Inventario -> Ajustes -> Ajuste de Existencia`).
- [ ] **4. Pantalla de Recibos de Cobro (`/recibos-cobro/create`):**
  - Conectar el selector de cliente con `GET /recibos-cobro/cuentas-pendientes?cliente_id=X` para mostrar las facturas con saldo deudor.
- [ ] **5. Pantalla de Anulaciones (`/anulaciones`):**
  - Probar flujo individual y por lote con modal de validación de contraseña de administrador.
- [ ] **6. Lazy-load de i18n y Auditoría de Rendimiento:**
  - Revisar la carga dinámica de diccionarios secundarios para optimizar el bundle inicial de Vite.
