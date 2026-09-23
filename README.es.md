# ERP Business — ERP y Punto de Venta multi-sucursal

**ERP retail full-stack: facturación, inventario, cuentas por cobrar y terminal POS para negocios multi-sucursal y multi-moneda.**
Construido con **NestJS + PostgreSQL** y **Vue 3 + TypeScript**. Este repositorio es una demo sanitizada: sin datos reales, y corre de punta a punta con pocos comandos.

`NestJS 11` · `TypeORM` · `PostgreSQL` · `Vue 3` · `Pinia` · `Tailwind CSS 4` · `Vite` · `JWT` · `Swagger`

> 🇬🇧 [English version](README.md)

![Tablero ejecutivo](docs/screenshots/dashboard.png)

## Qué hace

Una sola venta **mueve todo lo demás**: descuenta inventario, crea la cuenta por cobrar si es a crédito y aparece en el tablero ejecutivo.

| | |
|---|---|
| ![Facturas](docs/screenshots/invoices.png) | ![Cuentas por cobrar](docs/screenshots/receivables.png) |
| **Ventas y facturación** — emitir, anular, devolver; contado o crédito | **Cuentas por cobrar** — las ventas a crédito generan la cuenta automáticamente |

![Inventario](docs/screenshots/inventory.png)
*Inventario — existencia por almacén, transferencias, ajustes, kardex. El stock baja al emitir facturas.*

## Puntos destacados

- **Lazo transaccional cerrado** — login → factura → descuento de stock → cuenta por cobrar → anular restaura el stock. Verificado con un smoke test automático (`backend/scripts/smoke-test.js`).
- **Reglas de negocio en la base de datos** — triggers de PostgreSQL mantienen consistentes inventario y cuentas por cobrar (10 triggers respaldados por 15 funciones).
- **Multi-moneda** — USD / VES / COP con tasas de cambio, listas de precios por moneda (17 niveles) e IGTF.
- **Multi-sucursal** — sucursales, almacenes, numeración de documentos por sucursal y permisos por sucursal, además de roles nacionales.
- **Control de acceso por roles** — 70 permisos granulares en 9 roles, incluidos en el JWT y validados en API y UI.
- **Terminal POS** — área de cajero separada con apertura de turno, autorización de supervisor para acciones sensibles y totales multi-moneda en vivo.
- **Módulos administrativos** — compras, cuentas por pagar, recibos, devoluciones, anulación de documentos, transformaciones de inventario, seriales y lotes, importación/exportación de precios en Excel, reportes.

## Escala

| | |
|---|---|
| Endpoints REST | ~200 en 37 módulos (Swagger en `/api/docs`) |
| Base de datos | 46 tablas, 42 entidades mapeadas |
| Frontend | 85 vistas, 37 stores Pinia, ~45k líneas de TypeScript/Vue |
| Backend | ~15k líneas de TypeScript |

## Puesta en marcha (5 minutos)

**Requisitos:** Node.js 20+, pnpm, PostgreSQL 16+ (Python 3 + `openpyxl` solo para importar/exportar precios en Excel).

```bash
# 1. Base de datos
createdb erp_business_demo
psql erp_business_demo -v ON_ERROR_STOP=1 -f backend/db/schema.sql
psql erp_business_demo -v ON_ERROR_STOP=1 -f backend/db/seed.sql

# 2. Backend  →  http://localhost:3000/api  (Swagger: /api/docs)
cd backend
cp .env.example .env          # ajusta DATABASE_URL y JWT_SECRET
pnpm install && pnpm run start:dev

# 3. Verificar el flujo completo (con la API corriendo)
node scripts/smoke-test.js    # login → factura → stock → anular → stock restaurado

# 4. Frontend  →  http://localhost:5173
cd ../frontend-vue/erp-business-frontend
pnpm install && pnpm run dev
```

El frontend detecta el backend en el puerto 3000 del mismo host; si usas otro, define `VITE_API_URL` (ver `frontend-vue/erp-business-frontend/.env.example`).

**Usuarios demo** (clave `Demo1234!`): `admin` (acceso total) y `cajero`.

El seed carga la configuración de la app (permisos, roles, niveles de precio, bancos, métodos de pago) más datos ficticios: una empresa/sucursal/almacén, 5 productos, 3 clientes, 2 vendedores y stock inicial. Tasa demo: 1 USD = 100 Bs.

## Base de datos

`backend/db/schema.sql` es el esquema completo. La app usa `synchronize: false`: **el esquema se gestiona con SQL, no con TypeORM**; los cambios futuros deben agregarse como scripts SQL versionados.

## Notas

- Sanitizado para uso público: sin clientes, credenciales ni datos de negocio reales. **Cambia las claves demo antes de exponerlo.**
- Más detalle: [`docs/API_ENDPOINTS_MANUAL.md`](docs/API_ENDPOINTS_MANUAL.md), [`CONTRIBUTING.md`](CONTRIBUTING.md).
