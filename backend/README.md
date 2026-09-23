# ERP Business — Backend (NestJS + TypeORM + PostgreSQL)

Ver el `README.md` de la raíz para la puesta en marcha completa (BD, seed, usuarios demo).

- API bajo el prefijo `/api`; Swagger en `http://localhost:3000/api/docs`.
- Autenticación JWT (`POST /api/auth/login`); los permisos del rol viajan en el token.
- Validación global con `whitelist` + `forbidNonWhitelisted`: campos no declarados en los DTOs devuelven 400.
- Esquema gestionado por SQL (`db/schema.sql`), `synchronize: false`.
- `node scripts/smoke-test.js` verifica el flujo login → factura → inventario → anulación.
- Manual de endpoints: `../docs/API_ENDPOINTS_MANUAL.md`.

## Scripts
`pnpm run start:dev` · `pnpm run build` · `pnpm test` · `pnpm run lint`
