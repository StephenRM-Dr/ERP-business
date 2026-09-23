-- ERP Business demo: datos semilla. Cargar DESPUES de db/schema.sql.
--
-- Contiene (1) catalogos de configuracion de la app (permisos, roles, niveles de precio,
-- parametros fiscales, bancos) y (2) datos DEMO ficticios para poder recorrer el flujo
-- login -> POS -> factura -> inventario -> cobro sin datos reales.
--
-- Usuarios demo (clave: Demo1234!):  admin (rol Administrador)  |  cajero (rol cajero)
-- Cambia estas claves antes de exponer el sistema fuera de tu maquina.

BEGIN;

-- ---------------------------------------------------------------- Catalogos de la app
INSERT INTO public.permisos (id, clave_permiso, modulo, descripcion) VALUES
	(389, 'invoices.view', 'Facturación', 'Consultar historial y detalle de facturas emitidas'),
	(42, 'invoices.sellWithoutStock', 'Facturación', 'Permite facturar productos sin existencia suficiente (el stock queda en negativo)'),
	(395, 'invoices.discounts', 'Facturación', 'Permite aplicar descuentos manuales (porcentuales o monto) en facturación'),
	(396, 'invoices.cancelItem', 'Facturación', 'Permite eliminar renglones o productos ya ingresados en el carrito de venta'),
	(397, 'invoices.changeWarehouse', 'Facturación', 'Permite cambiar el almacén o depósito de despacho de un producto en la venta'),
	(398, 'invoices.changeSeller', 'Facturación', 'Permite cambiar el vendedor asignado a la factura'),
	(399, 'invoices.reprint', 'Facturación', 'Permite reimprimir facturas y comprobantes ya emitidos'),
	(400, 'invoices.exemptTax', 'Facturación', 'Permite exonerar IVA o modificar condiciones tributarias en la venta'),
	(401, 'invoices.openDrawer', 'Facturación', 'Permite abrir la gaveta de dinero manualmente sin registrar venta'),
	(403, 'cash.shifts', 'Caja', 'Apertura y cierre de turnos de caja'),
	(404, 'cash.blindClose', 'Caja', 'Realizar arqueo de caja ciego (sin ver el total esperado del sistema antes de contar)'),
	(405, 'cash.movements', 'Caja', 'Registro de entradas y salidas de efectivo / gastos menores de caja chica'),
	(406, 'cash.viewAllShifts', 'Caja', 'Consultar historial y arqueos de caja de otros cajeros y sucursales'),
	(7, 'inventory.summary', 'Inventario', 'Consultar inventario y existencias (solo consulta y lectura)'),
	(8, 'inventory.products', 'Inventario', 'Crear, editar y gestionar productos en el catálogo de inventario'),
	(409, 'inventory.deleteProduct', 'Inventario', 'Eliminar productos del catálogo de inventario'),
	(410, 'inventory.viewCosts', 'Inventario', 'Visualizar costos de compra y márgenes de ganancia (confidencial)'),
	(9, 'inventory.prices', 'Inventario', 'Ver y gestionar precios y costos de productos'),
	(12, 'inventory.categories', 'Inventario', 'Ver y gestionar categorías y líneas de productos'),
	(30, 'inventory.warehouses', 'Inventario', 'Ver y gestionar almacenes y depósitos'),
	(11, 'inventory.transfers', 'Inventario', 'Emitir traslados de inventario entre sucursales y almacenes'),
	(415, 'inventory.transfersReceive', 'Inventario', 'Recibir, confirmar y dar entrada a traslados entre sucursales'),
	(284, 'inventory.cargos', 'Inventario', 'Registro y consulta de cargos de inventario (entradas manuales)'),
	(10, 'inventory.control', 'Inventario', 'Ver y gestionar control de inventario y ajustes físicos'),
	(118, 'inventory.seriales', 'Inventario', 'Gestión y trazabilidad de números de serial de productos'),
	(117, 'inventory.lotes', 'Inventario', 'Gestión de lotes y fechas de vencimiento de productos'),
	(422, 'inventory.importExport', 'Inventario', 'Carga masiva de inventario y actualización de precios por Excel'),
	(145, 'inventario.transformar', 'Inventario', 'Ejecutar transformaciones de bobinas y materiales en su sucursal'),
	(144, 'inventario.verReglas', 'Inventario', 'Ver reglas y fórmulas de transformación de inventario'),
	(148, 'inventario.admin', 'Inventario', 'Crear y administrar reglas de transformación de inventario'),
	(146, 'inventario.preliminar', 'Inventario', 'Cargar y ver preliminares de inventario (tomas físicas)'),
	(147, 'inventario.nacional', 'Inventario', 'Aprobar preliminares y operar inventarios a nivel nacional'),
	(1, 'customers', 'Clientes', 'Ver y gestionar catálogo de clientes'),
	(429, 'customers.creditLimit', 'Clientes', 'Modificar límite de crédito y días de crédito de clientes'),
	(203, 'cuentas.cobrar', 'Ventas', 'Gestión y consulta de cuentas por cobrar'),
	(115, 'recibos.cobro', 'Ventas', 'Registro de recibos de cobro y abonos de clientes'),
	(432, 'recibos.cobro.anular', 'Ventas', 'Anulación de recibos de cobro y abonos emitidos'),
	(112, 'compras', 'Compras', 'Registro y consulta de facturas de compra'),
	(434, 'compras.void', 'Compras', 'Anulación de facturas de compra'),
	(111, 'master.proveedores', 'Compras', 'Ver y gestionar catálogo de proveedores'),
	(113, 'cuentas.pagar', 'Compras', 'Gestión y consulta de cuentas por pagar'),
	(114, 'pagos.proveedores', 'Compras', 'Registro de órdenes de pago a proveedores'),
	(109, 'corte', 'Taller', 'Ver comandas y órdenes pendientes de corte (taller de producción)'),
	(142, 'transacciones.anulaciones', 'Transacciones', 'Anulación individual y por lote de documentos de venta y fiscales'),
	(38, 'master.informes', 'Reportes', 'Ver informes y reportes gerenciales de ventas, inventario y CxC'),
	(85, 'general.viewAllLocations', 'General', 'Ver y filtrar por todas las sucursales/empresas (facturas, inventario) en vez de solo la propia'),
	(442, 'general.switchBranch', 'General', 'Permite cambiar de sucursal activa durante la sesión de trabajo'),
	(18, 'master.usuarios', 'Configuración', 'Ver y gestionar usuarios, contraseñas y permisos individuales'),
	(16, 'master.roles', 'Configuración', 'Ver y gestionar roles y permisos del sistema'),
	(14, 'master.empresas', 'Configuración', 'Ver y gestionar empresas y razones sociales'),
	(15, 'master.sucursales', 'Configuración', 'Ver y gestionar sucursales y tiendas'),
	(13, 'master.bancos', 'Configuración', 'Ver y gestionar entidades bancarias'),
	(2, 'invoices', 'Facturación', 'Ver y emitir facturas de venta en el sistema'),
	(282, 'invoices.credit', 'Facturación', 'Emitir facturas a crédito o con saldo pendiente sin requerir clave de supervisor'),
	(174, 'invoices.priceLocal', 'Facturación', 'Permite facturar con Tarifa Local de Tienda (Divisas y Bs)'),
	(173, 'invoices.priceNational', 'Facturación', 'Permite facturar con Tarifa Nacional / Mayorista (Divisas y Bs)'),
	(175, 'invoices.editPrice', 'Facturación', 'Permite editar o modificar el precio unitario en el punto de venta'),
	(3, 'returns', 'Facturación', 'Ver y gestionar devoluciones de clientes y notas de crédito'),
	(285, 'inventory.descargos', 'Inventario', 'Registro y consulta de descargos de inventario (salidas manuales / mermas)'),
	(286, 'inventory.kardex', 'Inventario', 'Consulta de Kardex y trazabilidad histórica de movimientos de productos'),
	(17, 'master.cuentasBancarias', 'Configuración', 'Ver y gestionar cuentas bancarias de la empresa'),
	(119, 'master.vendedores', 'Configuración', 'Gestión de vendedores y comisiones'),
	(83, 'master.impresoras', 'Configuración', 'Ver y gestionar la configuración de impresoras fiscales y térmicas por sucursal'),
	(39, 'master.tiposDocumentos', 'Configuración', 'Ver y gestionar tipos de documentos, series y correlativos'),
	(4, 'currencies', 'Configuración', 'Ver y gestionar catálogo de monedas'),
	(5, 'exchangeRates', 'Configuración', 'Ver y actualizar tasas de cambio de divisas'),
	(120, 'configuracion.metodos_pago', 'Configuración', 'Configuración de métodos de pago y cuentas receptoras'),
	(6, 'igtf', 'Configuración', 'Ver y configurar alícuotas y reglas de IGTF'),
	(116, 'master.parametros', 'Configuración', 'Parámetros fiscales generales (IVA, retenciones, etc.)'),
	(287, 'system.restablecer', 'Configuración', 'Permiso crítico para restablecer datos iniciales del sistema');

INSERT INTO public.roles (id, nombre, descripcion, activo, creado_en) VALUES
	(1, 'Administrador', 'Acceso total', true, '2026-05-25 00:00:35.569388'),
	(3, 'cajero', 'vendedor', true, '2026-07-22 15:19:26.325023'),
	(6, 'Inventario', 'Analista de Inventario', true, '2026-07-25 16:38:14.095677'),
	(7, 'Operacion', 'CORTE ', true, '2026-08-08 17:36:32.194426'),
	(8, 'INVENTARIO_SUCURSAL', 'Operador de inventario por tienda', true, '2026-09-02 15:45:01.566595'),
	(9, 'INVENTARIO_NACIONAL', 'Supervisor de inventario nacional', true, '2026-09-02 15:45:01.707927'),
	(10, 'VENTAS NACIONALES', '', true, '2026-09-03 20:08:33.509389'),
	(11, 'VENTAS REDES', 'Vendedores de redes sociales con acceso a precios locales de todas las tiendas', true, '2026-09-03 21:03:40.539036'),
	(12, 'ANALISTA DE COSTOS Y PRECIOS', 'Analista responsable de la gestión de costos de inventario, actualización de precios y carga masiva de listas en Excel', true, '2026-09-06 22:10:35.520916');

INSERT INTO public.rol_permisos (rol_id, permiso_id) VALUES
	(3, 2),
	(1, 30),
	(1, 1),
	(1, 2),
	(1, 3),
	(1, 4),
	(1, 5),
	(1, 6),
	(1, 7),
	(1, 8),
	(1, 9),
	(1, 10),
	(1, 11),
	(1, 12),
	(1, 13),
	(1, 14),
	(1, 15),
	(1, 16),
	(1, 17),
	(1, 18),
	(6, 8),
	(6, 9),
	(6, 10),
	(6, 11),
	(6, 12),
	(3, 5),
	(3, 6),
	(1, 38),
	(1, 39),
	(1, 42),
	(1, 85),
	(6, 85),
	(7, 109),
	(1, 111),
	(1, 112),
	(1, 113),
	(1, 114),
	(1, 115),
	(1, 116),
	(1, 117),
	(1, 118),
	(1, 119),
	(1, 120),
	(1, 142),
	(3, 42),
	(8, 144),
	(8, 145),
	(8, 146),
	(9, 85),
	(9, 144),
	(9, 145),
	(9, 146),
	(9, 147),
	(9, 148),
	(1, 145),
	(1, 146),
	(10, 1),
	(10, 42),
	(1, 173),
	(1, 174),
	(1, 175),
	(10, 2),
	(10, 173),
	(3, 174),
	(11, 2),
	(11, 174),
	(11, 42),
	(11, 85),
	(11, 5),
	(1, 83),
	(1, 109),
	(1, 144),
	(1, 147),
	(1, 148),
	(1, 203),
	(11, 1),
	(11, 119),
	(11, 7),
	(9, 7),
	(9, 8),
	(9, 12),
	(9, 30),
	(9, 11),
	(9, 10),
	(9, 9),
	(9, 118),
	(9, 117),
	(8, 7),
	(8, 8),
	(8, 11),
	(8, 10),
	(8, 118),
	(8, 117),
	(3, 1),
	(3, 3),
	(3, 7),
	(10, 5),
	(10, 6),
	(10, 3),
	(10, 7);

INSERT INTO public.rol_permisos (rol_id, permiso_id) VALUES
	(11, 6),
	(12, 9),
	(12, 8),
	(12, 12),
	(12, 7),
	(12, 85),
	(12, 4),
	(12, 5),
	(12, 38),
	(12, 10),
	(1, 282),
	(1, 284),
	(1, 285),
	(1, 286),
	(1, 287),
	(9, 286),
	(9, 284),
	(9, 285),
	(12, 286),
	(1, 389),
	(1, 395),
	(1, 396),
	(1, 397),
	(1, 398),
	(1, 399),
	(1, 400),
	(1, 401),
	(1, 403),
	(1, 404),
	(1, 405),
	(1, 406),
	(1, 429),
	(1, 432),
	(1, 434),
	(1, 442),
	(1, 409),
	(1, 410),
	(1, 415),
	(1, 422),
	(10, 85);

INSERT INTO public.niveles_precio (id, nombre, factor_utilidad_defecto) VALUES
	(1, 'Público', 0.00),
	(2, 'Precio San Cristóbal (Bs)', 0.00),
	(3, 'Precio Guayana (Bs)', 0.00),
	(4, 'Precio Concordia (Bs)', 0.00),
	(5, 'Precio Caracas (Bs)', 0.00),
	(6, 'Precio Valencia (Bs)', 0.00),
	(7, 'Precio Barinas (Bs)', 0.00),
	(8, 'Precio Maracaibo (Bs)', 0.00),
	(9, 'Precio Mérida (Bs)', 0.00),
	(10, 'Precio Nacional (Bs)', 0.00),
	(11, 'Divisa San Cristóbal (USD)', 0.00),
	(12, 'Divisa Nacional (USD)', 0.00),
	(13, 'Divisa Caracas (USD)', 0.00),
	(14, 'Divisa Valencia (USD)', 0.00),
	(15, 'Divisa Barinas (USD)', 0.00),
	(16, 'Divisa Maracaibo (USD)', 0.00),
	(17, 'Divisa Mérida (USD)', 0.00);

INSERT INTO public.parametros_fiscales (id, codigo, descripcion, porcentaje, activo, vigente_desde, vigente_hasta, creado_en) VALUES
	(1, 'IVA_GENERAL', 'IVA Alícuota General (16%)', 16.00, true, '2018-01-01', NULL, '2026-05-24 21:55:11.071996'),
	(2, 'IVA_REDUCIDA', 'IVA Alícuota Reducida - alimentos procesados (8%)', 8.00, true, '2018-01-01', NULL, '2026-05-24 21:55:11.071996'),
	(3, 'IVA_ADICIONAL', 'IVA Alícuota Adicional - bienes suntuarios (15%)', 15.00, true, '2018-01-01', NULL, '2026-05-24 21:55:11.071996'),
	(4, 'IGTF', 'IGTF - Impuesto a las Grandes Transacciones Financieras (3%)', 3.00, true, '2022-03-04', NULL, '2026-05-24 21:55:11.071996'),
	(5, 'RETENCION_IVA_CE', 'Retencion IVA a Contribuyentes Especiales (75%)', 75.00, true, '2018-01-01', NULL, '2026-05-25 00:11:42.793465');

INSERT INTO public.bancos (id, codigo, nombre, activo) VALUES
	(3, 'SOF', 'SOFITASA', true),
	(8, '0401', 'MERCANTIL', true),
	(10, 'BANESCO', 'Banesco Banco Universal', true),
	(11, 'BDV', 'Banco de Venezuela', true),
	(12, 'SOFITASA', 'Banco Sofitasa', true),
	(13, 'BANCAMIGA', 'Bancamiga Banco Universal', true),
	(14, 'PLAZA', 'Banco Plaza', true),
	(15, 'BANCOLOMBIA', 'Bancolombia', true),
	(16, 'ZELLE', 'Zelle USA', true),
	(17, 'BINANCE', 'Binance Pay / Cripto', true),
	(34, '0102', 'Banco de Venezuela', true),
	(35, '0104', 'Banco Venezolano de Crédito', true),
	(36, '0105', 'Banco Mercantil', true),
	(37, '0108', 'Banco Provincial (BBVA)', true),
	(38, '0114', 'Bancaribe', true),
	(39, '0115', 'Banco Exterior', true),
	(40, '0116', 'BOD (Banco Occidental de Descuento)', true),
	(41, '0128', 'Banco Caroní', true),
	(42, '0134', 'Banesco Banco Universal', true),
	(43, '0137', 'Banco Sofitasa', true),
	(44, '0138', 'Banco Plaza', true),
	(45, '0146', 'Bangente', true),
	(46, '0151', 'BFC (Banco Fondo Común)', true),
	(47, '0156', '100% Banco', true),
	(48, '0157', 'Del Sur Banco Universal', true),
	(49, '0163', 'Banco del Tesoro', true),
	(50, '0166', 'Banco Agrícola de Venezuela', true),
	(51, '0168', 'Bancrecer', true),
	(52, '0169', 'Mi Banco', true),
	(53, '0171', 'Banco Activo', true),
	(54, '0172', 'Bancamiga Banco Universal', true),
	(55, '0173', 'Banco Internacional de Desarrollo (BID)', true),
	(56, '0174', 'Banplus Banco Universal', true),
	(9, '0175', 'Banco Bicentenario / BDT', true),
	(58, '0176', 'Banco Espirito Santo', true),
	(59, '0177', 'BANFANB', true),
	(60, '0190', 'Citibank Venezuela', true),
	(61, '0191', 'Banco Nacional de Crédito (BNC)', true),
	(62, '0601', 'Instituto Municipal de Crédito Popular (IMCP)', true);


INSERT INTO monedas (id, codigo_iso, descripcion, simbolo, es_moneda_base, activo) VALUES
  (1, 'VES', 'Bolívares', 'Bs.S', false, true),
  (2, 'USD', 'Dólares Americanos', '$', true, true),
  (3, 'COP', 'Pesos Colombianos', 'COP$', false, true);

INSERT INTO metodos_pago (id, codigo, nombre, moneda_id, activo, requiere_cuenta_bancaria) VALUES
  (1,  'BOLIVARES',         'Pago Móvil / Transferencia Bs', 1, true,  true),
  (2,  'EFECTIVO_BS',       'Efectivo Bolívares',            1, false, false),
  (3,  'ZELLE',             'Zelle ($)',                     2, true,  true),
  (4,  'EFECTIVO_USD',      'Dólares Efectivo ($)',          2, true,  false),
  (6,  'BINANCE',           'Binance Pay / USDT ($)',        2, true,  true),
  (7,  'BANCOLOMBIA',       'Bancolombia (COP)',             3, true,  true),
  (9,  'EFECTIVO_COP',      'Pesos Efectivo (COP)',          3, true,  false),
  (10, 'EFECTIVO_VES',      'Bolívares Efectivo (Bs)',       1, true,  false),
  (13, 'BANESCO_VERDE',     'Banesco Cuenta Verde ($)',      2, true,  true),
  (15, 'TRANSFERENCIA_VES', 'Transferencia Bancaria (Bs)',   1, true,  true),
  (16, 'PAGO_MOVIL',        'Pago Móvil (Bs)',               1, true,  true);

-- ---------------------------------------------------------------- Datos DEMO (ficticios)
INSERT INTO empresas (id, nombre, siglas, rif, direccion_fiscal, direccion_despacho, telefono, email, igtf_activo, igtf_porcentaje) VALUES
  (1, 'Demo Comercial, C.A.', 'DEMO', 'J-00000000-0', 'Av. Principal, Ciudad Demo', 'Av. Principal, Ciudad Demo', '0200-0000000', 'demo@example.com', true, 3.00);

INSERT INTO sucursales (id, empresa_id, codigo, nombre, direccion, telefono, activo, siglas) VALUES
  (1, 1, 'SUC01', 'Tienda Demo', 'Av. Principal, Ciudad Demo', '0200-0000000', true, 'DEMO');

INSERT INTO depositos (id, sucursal_id, codigo, nombre, responsable, activo, permite_facturar) VALUES
  (1, 1, 'ALM01', 'Almacén Principal', 'Encargado Demo', true, true);

INSERT INTO tipos_documentos (sucursal_id, codigo, nombre, correlativo_actual, longitud_formato, prefijo, activo) VALUES
  (1, 'AJ',   'Ajuste',                          0, 8, '',      true),
  (1, 'C',    'Cargo',                           0, 8, 'C-',    true),
  (1, 'D',    'Descargo',                        0, 8, 'D-',    true),
  (1, 'DEV',  'Devolución',                      0, 8, '',      true),
  (1, 'DEVN', 'Devolución Nacional',             0, 8, '',      true),
  (1, 'FAC',  'Factura',                         0, 8, 'FAC-',  true),
  (1, 'FACN', 'Factura Nacional',                0, 8, '',      true),
  (1, 'RC',   'Recibo de Cobro',                 0, 8, 'RC-',   true),
  (1, 'TR',   'Transferencia entre Sucursales',  0, 8, 'TR-',   true),
  (1, 'TRF',  'Transformación de Inventario',    0, 6, 'TRF-',  true);

-- factor = valor de 1 unidad de la moneda expresado en USD (demo: 1 USD = 100 Bs = 4000 COP)
INSERT INTO tasas_cambio (moneda_id, fecha_tasa, factor) VALUES
  (1, now(), 0.010000000000000000),
  (3, now(), 0.000250000000000000);

INSERT INTO cuentas_bancarias (banco_id, numero_cuenta, tipo_cuenta, moneda_id, descripcion, saldo_conciliado, activo)
SELECT b.id, '0000-0000-00-0000000001', 'CORRIENTE', 1, 'Cuenta Demo Bs', 0, true FROM bancos b WHERE b.codigo = 'BANESCO'
UNION ALL
SELECT b.id, '0000-0000-00-0000000002', 'EXTRANJERA', 2, 'Cuenta Demo USD', 0, true FROM bancos b WHERE b.codigo = 'BANESCO';

INSERT INTO vendedores (codigo, nombre, email, telefono, comision_porcentaje, activo, sucursal_id, canal) VALUES
  ('V-DEMO-01',  'Vendedor Demo Tienda', 'vendedor1@example.com', '04140000001', 3.00, true, 1, 'TIENDA'),
  ('V-DEMO-02',  'Vendedor Demo Redes',  'vendedor2@example.com', '04140000002', 3.00, true, 1, 'REDES');

INSERT INTO clientes (nombre, apellido, telefono, email, limite_credito, dias_credito, contribuyente_especial, tipo_documento, numero_documento) VALUES
  ('Consumidor', 'Final', NULL,          NULL,                  0,    0,  false, 'V', '00000000'),
  ('Cliente',    'Demo',  '04140000003', 'cliente@example.com', 500,  15, false, 'V', '12345678'),
  ('Empresa Ejemplo, C.A.', NULL, '02000000001', 'ventas@example.com', 2000, 30, true, 'J', '000000001');

INSERT INTO categorias (codigo, nombre, descripcion, activo) VALUES
  ('GEN', 'General',    'Categoría general de demostración', true),
  ('ACC', 'Accesorios', 'Accesorios de demostración',        true);

INSERT INTO productos (codigo, referencia, nombre, categoria_id, unidad_medida, marca, moneda_base_id, precio_costo, impuesto_porcentaje, precio_venta, moneda_venta_id, activo)
SELECT v.codigo, v.ref, v.nombre, c.id, 'UND', 'Demo', 2, v.costo, 16.00, v.pvp, 2, true
FROM (VALUES
  ('DEMO-001', 'REF-001', 'Producto Demo Uno',    'GEN', 10.00, 15.00),
  ('DEMO-002', 'REF-002', 'Producto Demo Dos',    'GEN', 20.00, 30.00),
  ('DEMO-003', 'REF-003', 'Producto Demo Tres',   'GEN',  5.00,  8.00),
  ('DEMO-004', 'REF-004', 'Accesorio Demo Cuatro','ACC',  2.50,  4.00),
  ('DEMO-005', 'REF-005', 'Accesorio Demo Cinco', 'ACC',  1.00,  2.00)
) AS v(codigo, ref, nombre, cat, costo, pvp)
JOIN categorias c ON c.codigo = v.cat;

-- Precios por nivel: niveles 2-10 en Bs, resto en USD (100 Bs = 1 USD en la demo)
INSERT INTO producto_precios (producto_id, nivel_precio_id, moneda_id, precio, activo)
SELECT p.id, n.id,
       CASE WHEN n.id BETWEEN 2 AND 10 THEN 1 ELSE 2 END,
       CASE WHEN n.id BETWEEN 2 AND 10 THEN p.precio_venta * 100 ELSE p.precio_venta END,
       true
FROM productos p CROSS JOIN niveles_precio n;

INSERT INTO inventario_stock (producto_id, deposito_id, existencia, reservado)
SELECT id, 1, 100, 0 FROM productos;

-- Usuarios demo. Clave: Demo1234!
INSERT INTO usuarios (username, clave_hash, nombre_completo, email, rol_id, sucursal_id, activo) VALUES
  ('admin',  '$2b$10$pRwMgKqOy80m6omJyzKu2uuirzNS.Qt4Mee5Fi3ZQCM99lV94EuC6', 'Administrador Demo', 'admin@example.com',  1, 1, true),
  ('cajero', '$2b$10$pRwMgKqOy80m6omJyzKu2uuirzNS.Qt4Mee5Fi3ZQCM99lV94EuC6', 'Cajero Demo',        'cajero@example.com', 3, 1, true);

-- ---------------------------------------------------------------- Secuencias
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT s.relname AS seq, t.relname AS tbl, a.attname AS col
    FROM pg_class s
    JOIN pg_depend d ON d.objid = s.oid AND d.deptype = 'a'
    JOIN pg_class t ON t.oid = d.refobjid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    WHERE s.relkind = 'S' AND s.relnamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('SELECT setval(%L, GREATEST(COALESCE((SELECT MAX(%I) FROM %I), 0), 1), (SELECT COUNT(*) > 0 FROM %I))',
                   'public.' || r.seq, r.col, r.tbl, r.tbl);
  END LOOP;
END $$;

COMMIT;
