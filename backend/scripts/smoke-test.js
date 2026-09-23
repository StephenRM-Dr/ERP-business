/**
 * Smoke test del flujo cerrado: login -> catalogos -> factura -> efectos en inventario.
 *
 * Requisitos: BD con db/schema.sql + db/seed.sql cargados y la API corriendo.
 * Uso:   node scripts/smoke-test.js            (usa API_URL o http://localhost:$PORT/api)
 *
 * Sale con codigo != 0 si algun paso falla.
 */
require('dotenv').config();
const { Client } = require('pg');

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}/api`;
const USER = process.env.SMOKE_USER || 'cajero';
const PASS = process.env.SMOKE_PASS || 'Demo1234!';

let token = null;
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data).slice(0, 400)}`);
  }
  return data;
}
const list = (d) => (Array.isArray(d) ? d : d?.data ?? d?.items ?? []);
function step(msg) { console.log('  ->', msg); }
function assert(cond, msg) { if (!cond) throw new Error('ASSERT: ' + msg); }

async function main() {
  console.log(`Smoke test contra ${API}`);

  step(`login como "${USER}"`);
  const login = await api('POST', '/auth/login', { username: USER, password: PASS });
  token = login.accessToken;
  assert(token, 'sin accessToken');
  assert(login.user.permisos.length > 0, 'el usuario no tiene permisos');

  step('catalogos: producto demo, cliente y moneda');
  const productos = list(await api('GET', '/productos?limit=100'));
  const prod = productos.find((p) => p.codigo === 'DEMO-001');
  assert(prod, 'no existe el producto DEMO-001 (seed cargado?)');
  const clientes = list(await api('GET', '/clientes?limit=100'));
  const cliente = clientes.find((c) => c.numero_documento === '12345678');
  assert(cliente, 'no existe el cliente demo');
  const monedas = list(await api('GET', '/monedas'));
  const usd = monedas.find((m) => m.codigo_iso === 'USD');
  assert(usd, 'no existe la moneda USD');

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stockDe = async () =>
    Number((await db.query('SELECT existencia FROM inventario_stock WHERE producto_id=$1 AND deposito_id=1', [prod.id])).rows[0].existencia);
  const antes = await stockDe();

  step('crear factura (2 x DEMO-001, pago en efectivo USD)');
  const cantidad = 2;
  const subtotal = +(cantidad * 15).toFixed(2);
  const iva = +(subtotal * 0.16).toFixed(2);
  const igtf = +(((subtotal + iva) * 0.03)).toFixed(2);
  const total = +(subtotal + iva + igtf).toFixed(2);
  const factura = await api('POST', '/facturas', {
    cliente_id: cliente.id,
    moneda_id: usd.id,
    tasa_cambio: 1,
    subtotal,
    base_imponible: subtotal,
    base_exenta: 0,
    monto_iva: iva,
    igtf,
    total,
    condicion_pago: 'CONTADO',
    sucursal_id: 1,
    items: [
      { producto_id: prod.id, deposito_id: 1, cantidad, precio_unitario: 15, subtotal, impuesto_porcentaje: 16, monto_iva_linea: iva },
    ],
    pagos: [{ metodo_pago: 'EFECTIVO_USD', monto: total, moneda_pago_codigo: 'USD' }],
  });
  assert(factura?.id, 'la factura no devolvio id');
  step(`factura creada id=${factura.id} nro=${factura.numero_factura ?? factura.numero ?? '?'}`);

  step('verificar descuento de inventario por trigger');
  const despues = await stockDe();
  assert(antes - despues === cantidad, `stock esperado ${antes - cantidad}, real ${despues}`);

  step('anular factura y verificar que el stock se restaura');
  await api('PATCH', `/facturas/${factura.id}/anular`, { motivo: 'Smoke test' });
  const restaurado = await stockDe();
  assert(restaurado === antes, `stock tras anular esperado ${antes}, real ${restaurado}`);

  await db.end();
  console.log('OK - flujo login -> factura -> inventario -> anulacion verificado');
}

main().catch((e) => {
  console.error('FALLO:', e.message);
  process.exit(1);
});
