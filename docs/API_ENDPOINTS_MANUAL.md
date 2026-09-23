# Manual de Endpoints de la API - ERP Business

> **URL Base:** `http://localhost:3000/api` (o el host donde esté desplegado el backend)  
> **Documentación Interactiva Swagger:** `http://localhost:3000/api/docs`  
> **Autenticación:** Formato Bearer Token JWT en la cabecera HTTP: `Authorization: Bearer <token_jwt>`

---

## 📌 ¿Está disponible el Endpoint de Vendedores?

**SÍ, ESTÁ 100% DISPONIBLE E IMPLEMENTADO.**

El backend cuenta con el módulo completo de Vendedores en [`backend/src/vendedores/vendedores.controller.ts`](../backend/src/vendedores/vendedores.controller.ts).

### Endpoints del Módulo `Vendedores` (`/api/vendedores`)

* **Permiso Requerido:** `master.vendedores`
* **Campos del Vendedor (`Vendedor` Entity):**
  * `id`: Identificador autoincremental (`number`)
  * `codigo`: Código único del vendedor (`string`, máx. 30 chars, ej. `"VEND-01"`)
  * `nombre`: Nombre completo del vendedor (`string`, máx. 100 chars)
  * `email`: Correo electrónico (`string`, opcional, máx. 100 chars)
  * `telefono`: Número de teléfono (`string`, opcional, máx. 40 chars)
  * `comision_porcentaje`: Porcentaje de comisión (`number`, opcional, default: `0.00`)
  * `activo`: Estado (`boolean`, default: `true`)

| Método HTTP | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/vendedores` | `master.vendedores` | Registrar un nuevo vendedor |
| **`GET`** | `/api/vendedores` | `master.vendedores` | Listar todos los vendedores activos e inactivos |
| **`GET`** | `/api/vendedores/:id` | `master.vendedores` | Obtener detalle de un vendedor por su ID |
| **`PATCH`** | `/api/vendedores/:id` | `master.vendedores` | Actualizar datos de un vendedor |
| **`DELETE`** | `/api/vendedores/:id` | `master.vendedores` | Eliminar / Dar de baja a un vendedor |

#### Ejemplo de Petición para Crear Vendedor:
```http
POST /api/vendedores HTTP/1.1
Host: localhost:3000
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "codigo": "VEND-001",
  "nombre": "Carlos Pérez",
  "email": "carlos.perez@empresa.com",
  "telefono": "+58 414-1234567",
  "comision_porcentaje": 3.5,
  "activo": true
}
```

---

## 📚 Índice General de Módulos y Endpoints Disponibles

El backend cuenta con **36 módulos y 172 endpoints** disponibles:

1. [Autenticación (`auth`)](#1-autenticación-auth)
2. [Vendedores (`vendedores`)](#2-vendedores-vendedores)
3. [Facturas de Venta (`facturas`)](#3-facturas-de-venta-facturas)
4. [Documentos Preliminares (`preliminares`)](#4-documentos-preliminares-preliminares)
5. [Comandas de Corte (`comandas-corte`)](#5-comandas-de-corte-comandas-corte)
6. [Devoluciones de Venta (`devoluciones`)](#6-devoluciones-de-venta-devoluciones)
7. [Anulaciones (`anulaciones`)](#7-anulaciones-anulaciones)
8. [Cuentas por Cobrar (`cuentas-cobrar`)](#8-cuentas-por-cobrar-cuentas-cobrar)
9. [Recibos de Cobro (`recibos-cobro`)](#9-recibos-de-cobro-recibos-cobro)
10. [Compras (`compras`)](#10-compras-compras)
11. [Cuentas por Pagar (`cuentas-pagar`)](#11-cuentas-por-pagar-cuentas-pagar)
12. [Pagos a Proveedores (`pagos-proveedores`)](#12-pagos-a-proveedores-pagos-proveedores)
13. [Productos (`productos`)](#13-productos-productos)
14. [Inventario y Stock (`stock`)](#14-inventario-y-stock-stock)
15. [Transferencias entre Almacenes (`transferencias`)](#15-transferencias-entre-almacenes-transferencias)
16. [Lotes (`lotes`)](#16-lotes-lotes)
17. [Seriales (`seriales`)](#17-seriales-seriales)
18. [Clientes (`clientes`)](#18-clientes-clientes)
19. [Proveedores (`proveedores`)](#19-proveedores-proveedores)
20. [Almacenes / Depósitos (`almacenes`)](#20-almacenes--depósitos-almacenes)
21. [Sucursales (`sucursales`)](#21-sucursales-sucursales)
22. [Empresas (`empresas`)](#22-empresas-empresas)
23. [Categorías (`categorias`)](#23-categorías-categorias)
24. [Monedas (`monedas`)](#24-monedas-monedas)
25. [Tasas de Cambio (`tasas-cambio`)](#25-tasas-de-cambio-tasas-cambio)
26. [Métodos de Pago (`metodos-pago`)](#26-métodos-de-pago-metodos-pago)
27. [Bancos (`bancos`)](#27-bancos-bancos)
28. [Cuentas Bancarias (`cuentas-bancarias`)](#28-cuentas-bancarias-cuentas-bancarias)
29. [Niveles de Precio (`niveles-precio`)](#29-niveles-de-precio-niveles-precio)
30. [Tipos de Documentos (`tipos-documentos`)](#30-tipos-de-documentos-tipos-documentos)
31. [Parámetros Fiscales (`parametros-fiscales`)](#31-parámetros-fiscales-parametros-fiscales)
32. [Impresoras por Sucursal (`impresoras-sucursal`)](#32-impresoras-por-sucursal-impresoras-sucursal)
33. [Usuarios (`usuarios`)](#33-usuarios-usuarios)
34. [Roles (`roles`)](#34-roles-roles)
35. [Permisos (`permisos`)](#35-permisos-permisos)

---

### 1. Autenticación (`auth`)
* Controlador: [`backend/src/auth/auth.controller.ts`](../backend/src/auth/auth.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/auth/login` | Público | Iniciar sesión y obtener Bearer Token JWT |

---

### 2. Vendedores (`vendedores`)
* Controlador: [`backend/src/vendedores/vendedores.controller.ts`](../backend/src/vendedores/vendedores.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/vendedores` | `master.vendedores` | Crear vendedor |
| **`GET`** | `/api/vendedores` | `master.vendedores` | Listar vendedores |
| **`GET`** | `/api/vendedores/:id` | `master.vendedores` | Obtener vendedor por ID |
| **`PATCH`** | `/api/vendedores/:id` | `master.vendedores` | Actualizar vendedor |
| **`DELETE`** | `/api/vendedores/:id` | `master.vendedores` | Eliminar vendedor |

---

### 3. Facturas de Venta (`facturas`)
* Controlador: [`backend/src/facturas/facturas.controller.ts`](../backend/src/facturas/facturas.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/facturas` | `ventas.facturar` | Emitir factura de venta |
| **`GET`** | `/api/facturas` | `ventas.reportes` | Listar facturas de venta (soporta paginación, filtros de fecha/cliente/sucursal) |
| **`GET`** | `/api/facturas/proximo-correlativo` | `ventas.facturar` | Obtener el próximo correlativo numérico de factura |
| **`GET`** | `/api/facturas/:id` | `ventas.reportes` | Obtener detalle completo de una factura por ID |
| **`PATCH`** | `/api/facturas/:id/anular` | `ventas.facturar` | Anular factura de venta |

---

### 4. Documentos Preliminares (`preliminares`)
* Controlador: [`backend/src/preliminares/preliminares.controller.ts`](../backend/src/preliminares/preliminares.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/preliminares` | `ventas.facturar` | Guardar borrador / preliminar de factura o transferencia |
| **`GET`** | `/api/preliminares` | `ventas.facturar` | Listar documentos preliminares guardados |
| **`GET`** | `/api/preliminares/:id` | `ventas.facturar` | Cargar detalle de un documento preliminar |
| **`PATCH`** | `/api/preliminares/:id` | `ventas.facturar` | Actualizar documento preliminar |
| **`DELETE`** | `/api/preliminares/:id` | `ventas.facturar` | Eliminar borrador preliminar |

---

### 5. Comandas de Corte (`comandas-corte`)
* Controlador: [`backend/src/comandas-corte/comandas-corte.controller.ts`](../backend/src/comandas-corte/comandas-corte.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`GET`** | `/api/comandas-corte` | `ventas.reportes` | Consultar comandas de corte por rango de fechas, sucursal y estado |

---

### 6. Devoluciones de Venta (`devoluciones`)
* Controlador: [`backend/src/devoluciones/devoluciones.controller.ts`](../backend/src/devoluciones/devoluciones.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/devoluciones` | `ventas.devoluciones` | Crear devolución de venta / Nota de Crédito |
| **`GET`** | `/api/devoluciones` | `ventas.devoluciones` | Listar devoluciones de venta |
| **`GET`** | `/api/devoluciones/:id` | `ventas.devoluciones` | Obtener devolución por ID |
| **`PATCH`** | `/api/devoluciones/:id/anular` | `ventas.devoluciones` | Anular devolución de venta |
| **`DELETE`** | `/api/devoluciones/:id` | `ventas.devoluciones` | Eliminar devolución |

---

### 7. Anulaciones (`anulaciones`)
* Controlador: [`backend/src/anulaciones/anulaciones.controller.ts`](../backend/src/anulaciones/anulaciones.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`GET`** | `/api/anulaciones/candidatos` | `ventas.anulaciones` | Buscar documentos candidatos a anular |
| **`POST`** | `/api/anulaciones` | `ventas.anulaciones` | Procesar anulación de documento |
| **`GET`** | `/api/anulaciones/historial` | `ventas.anulaciones` | Consultar historial de anulaciones realizadas |

---

### 8. Cuentas por Cobrar (`cuentas-cobrar`)
* Controlador: [`backend/src/cuentas-cobrar/cuentas-cobrar.controller.ts`](../backend/src/cuentas-cobrar/cuentas-cobrar.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/cuentas-cobrar` | `cxc.gestionar` | Registrar cuenta por cobrar manual |
| **`GET`** | `/api/cuentas-cobrar` | `cxc.gestionar` | Listar cuentas por cobrar con saldo |
| **`GET`** | `/api/cuentas-cobrar/:id` | `cxc.gestionar` | Obtener cuenta por cobrar por ID |
| **`PATCH`** | `/api/cuentas-cobrar/:id` | `cxc.gestionar` | Modificar cuenta por cobrar |
| **`DELETE`** | `/api/cuentas-cobrar/:id` | `cxc.gestionar` | Eliminar cuenta por cobrar |

---

### 9. Recibos de Cobro (`recibos-cobro`)
* Controlador: [`backend/src/recibos-cobro/recibos-cobro.controller.ts`](../backend/src/recibos-cobro/recibos-cobro.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/recibos-cobro` | `cxc.gestionar` | Crear recibo de cobro (aplica pagos a CxC) |
| **`GET`** | `/api/recibos-cobro` | `cxc.gestionar` | Listar recibos de cobro emitidos |
| **`GET`** | `/api/recibos-cobro/:id` | `cxc.gestionar` | Obtener detalle de recibo de cobro |
| **`PATCH`** | `/api/recibos-cobro/:id` | `cxc.gestionar` | Actualizar recibo de cobro |
| **`DELETE`** | `/api/recibos-cobro/:id` | `cxc.gestionar` | Anular / eliminar recibo de cobro |

---

### 10. Compras (`compras`)
* Controlador: [`backend/src/compras/compras.controller.ts`](../backend/src/compras/compras.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/compras` | `compras.registrar` | Registrar factura de compra |
| **`GET`** | `/api/compras` | `compras.reportes` | Listar compras realizadas |
| **`GET`** | `/api/compras/proximo-correlativo` | `compras.registrar` | Obtener correlativo de compra |
| **`GET`** | `/api/compras/:id` | `compras.reportes` | Obtener detalle de compra por ID |
| **`PATCH`** | `/api/compras/:id/anular` | `compras.registrar` | Anular factura de compra |
| **`DELETE`** | `/api/compras/:id` | `compras.registrar` | Eliminar registro de compra |

---

### 11. Cuentas por Pagar (`cuentas-pagar`)
* Controlador: [`backend/src/cuentas-pagar/cuentas-pagar.controller.ts`](../backend/src/cuentas-pagar/cuentas-pagar.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/cuentas-pagar` | `cxp.gestionar` | Registrar cuenta por pagar |
| **`GET`** | `/api/cuentas-pagar` | `cxp.gestionar` | Listar cuentas por pagar |
| **`GET`** | `/api/cuentas-pagar/:id` | `cxp.gestionar` | Obtener cuenta por pagar por ID |
| **`PATCH`** | `/api/cuentas-pagar/:id` | `cxp.gestionar` | Modificar cuenta por pagar |
| **`DELETE`** | `/api/cuentas-pagar/:id` | `cxp.gestionar` | Eliminar cuenta por pagar |

---

### 12. Pagos a Proveedores (`pagos-proveedores`)
* Controlador: [`backend/src/pagos-proveedores/pagos-proveedores.controller.ts`](../backend/src/pagos-proveedores/pagos-proveedores.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/pagos-proveedores` | `cxp.gestionar` | Registrar pago a proveedor |
| **`GET`** | `/api/pagos-proveedores` | `cxp.gestionar` | Listar pagos emitidos a proveedores |
| **`GET`** | `/api/pagos-proveedores/:id` | `cxp.gestionar` | Obtener detalle de pago a proveedor |
| **`DELETE`** | `/api/pagos-proveedores/:id` | `cxp.gestionar` | Eliminar pago a proveedor |

---

### 13. Productos (`productos`)
* Controlador: [`backend/src/productos/productos.controller.ts`](../backend/src/productos/productos.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/productos` | `inventario.productos` | Crear nuevo producto |
| **`GET`** | `/api/productos` | `inventario.productos` | Listar productos (`take`, `skip`) |
| **`GET`** | `/api/productos/:codigo` | `inventario.productos` | Obtener producto por código |
| **`PATCH`** | `/api/productos/:codigo` | `inventario.productos` | Actualizar datos del producto |
| **`DELETE`** | `/api/productos/:codigo` | `inventario.productos` | Eliminar producto |
| **`GET`** | `/api/productos/:codigo/costos` | `inventario.productos` | Historial de costos del producto |
| **`POST`** | `/api/productos/:codigo/costos` | `inventario.productos` | Registrar nuevo costo |
| **`PATCH`** | `/api/productos/:codigo/costos/:costoId` | `inventario.productos` | Modificar costo existente |
| **`DELETE`** | `/api/productos/:codigo/costos/:costoId` | `inventario.productos` | Eliminar registro de costo |
| **`GET`** | `/api/productos/:codigo/precios` | `inventario.productos` | Listar precios por nivel del producto |
| **`POST`** | `/api/productos/:codigo/precios` | `inventario.productos` | Agregar precio a nivel |
| **`PATCH`** | `/api/productos/:codigo/precios/:precioId` | `inventario.productos` | Modificar precio de nivel |
| **`DELETE`** | `/api/productos/:codigo/precios/:precioId` | `inventario.productos` | Eliminar precio de nivel |

---

### 14. Inventario y Stock (`stock`)
* Controlador: [`backend/src/stock/stock.controller.ts`](../backend/src/stock/stock.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/stock` | `inventario.control` | Crear registro inicial de stock en almacén |
| **`GET`** | `/api/stock` | `inventario.control` | Listar existencias (filtros: `productoId`, `almacenId`, `sucursalId`) |
| **`GET`** | `/api/stock/:id` | `inventario.control` | Obtener registro de stock por ID |
| **`PATCH`** | `/api/stock/:id` | `inventario.control` | Realizar ajuste manual de inventario (genera AJ) |
| **`DELETE`** | `/api/stock/:id` | `inventario.control` | Dar de baja registro de stock |

---

### 15. Transferencias entre Almacenes (`transferencias`)
* Controlador: [`backend/src/transferencias/transferencias.controller.ts`](../backend/src/transferencias/transferencias.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/transferencias` | `inventario.transferencias` | Registrar transferencia / movimiento de inventario |
| **`GET`** | `/api/transferencias` | `inventario.transferencias` | Listar transferencias |
| **`GET`** | `/api/transferencias/proximo-correlativo` | `inventario.transferencias` | Obtener correlativo de transferencia |
| **`GET`** | `/api/transferencias/:id` | `inventario.transferencias` | Obtener detalle de transferencia |
| **`PATCH`** | `/api/transferencias/:id/anular` | `inventario.transferencias` | Anular transferencia |
| **`DELETE`** | `/api/transferencias/:id` | `inventario.transferencias` | Eliminar transferencia |

---

### 16. Lotes (`lotes`)
* Controlador: [`backend/src/lotes/lotes.controller.ts`](../backend/src/lotes/lotes.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/lotes` | `inventario.lotes` | Registrar lote |
| **`GET`** | `/api/lotes` | `inventario.lotes` | Listar lotes |
| **`GET`** | `/api/lotes/:id` | `inventario.lotes` | Obtener lote por ID |
| **`PATCH`** | `/api/lotes/:id` | `inventario.lotes` | Actualizar lote |
| **`DELETE`** | `/api/lotes/:id` | `inventario.lotes` | Eliminar lote |

---

### 17. Seriales (`seriales`)
* Controlador: [`backend/src/seriales/seriales.controller.ts`](../backend/src/seriales/seriales.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/seriales` | `inventario.seriales` | Registrar serial |
| **`GET`** | `/api/seriales` | `inventario.seriales` | Listar seriales |
| **`GET`** | `/api/seriales/:id` | `inventario.seriales` | Obtener serial por ID |
| **`PATCH`** | `/api/seriales/:id` | `inventario.seriales` | Actualizar serial |
| **`DELETE`** | `/api/seriales/:id` | `inventario.seriales` | Eliminar serial |

---

### 18. Clientes (`clientes`)
* Controlador: [`backend/src/clientes/clientes.controller.ts`](../backend/src/clientes/clientes.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/clientes` | `master.clientes` | Registrar nuevo cliente |
| **`GET`** | `/api/clientes` | `master.clientes` | Listar todos los clientes |
| **`GET`** | `/api/clientes/:id` | `master.clientes` | Obtener cliente por ID |
| **`PATCH`** | `/api/clientes/:id` | `master.clientes` | Actualizar datos del cliente |
| **`DELETE`** | `/api/clientes/:id` | `master.clientes` | Eliminar cliente |

---

### 19. Proveedores (`proveedores`)
* Controlador: [`backend/src/proveedores/proveedores.controller.ts`](../backend/src/proveedores/proveedores.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/proveedores` | `master.proveedores` | Registrar nuevo proveedor |
| **`GET`** | `/api/proveedores` | `master.proveedores` | Listar proveedores |
| **`GET`** | `/api/proveedores/:id` | `master.proveedores` | Obtener proveedor por ID |
| **`PATCH`** | `/api/proveedores/:id` | `master.proveedores` | Actualizar proveedor |
| **`DELETE`** | `/api/proveedores/:id` | `master.proveedores` | Eliminar proveedor |

---

### 20. Almacenes / Depósitos (`almacenes`)
* Controlador: [`backend/src/almacenes/almacenes.controller.ts`](../backend/src/almacenes/almacenes.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/almacenes` | `master.almacenes` | Crear almacén/depósito |
| **`GET`** | `/api/almacenes` | `master.almacenes` | Listar almacenes |
| **`GET`** | `/api/almacenes/:id` | `master.almacenes` | Obtener almacén por ID |
| **`PATCH`** | `/api/almacenes/:id` | `master.almacenes` | Actualizar almacén |
| **`DELETE`** | `/api/almacenes/:id` | `master.almacenes` | Eliminar almacén |

---

### 21. Sucursales (`sucursales`)
* Controlador: [`backend/src/sucursales/sucursales.controller.ts`](../backend/src/sucursales/sucursales.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/sucursales` | `master.sucursales` | Crear sucursal |
| **`GET`** | `/api/sucursales` | `master.sucursales` | Listar sucursales |
| **`GET`** | `/api/sucursales/:id` | `master.sucursales` | Obtener sucursal por ID |
| **`PATCH`** | `/api/sucursales/:id` | `master.sucursales` | Actualizar sucursal |
| **`DELETE`** | `/api/sucursales/:id` | `master.sucursales` | Eliminar sucursal |

---

### 22. Empresas (`empresas`)
* Controlador: [`backend/src/empresas/empresas.controller.ts`](../backend/src/empresas/empresas.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/empresas` | `master.empresas` | Crear empresa |
| **`GET`** | `/api/empresas` | `master.empresas` | Listar empresas |
| **`GET`** | `/api/empresas/:id` | `master.empresas` | Obtener empresa por ID |
| **`PATCH`** | `/api/empresas/:id` | `master.empresas` | Actualizar empresa |
| **`DELETE`** | `/api/empresas/:id` | `master.empresas` | Eliminar empresa |

---

### 23. Categorías (`categorias`)
* Controlador: [`backend/src/categorias/categorias.controller.ts`](../backend/src/categorias/categorias.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/categorias` | `master.categorias` | Crear categoría |
| **`GET`** | `/api/categorias` | `master.categorias` | Listar categorías |
| **`GET`** | `/api/categorias/:id` | `master.categorias` | Obtener categoría por ID |
| **`PATCH`** | `/api/categorias/:id` | `master.categorias` | Actualizar categoría |
| **`DELETE`** | `/api/categorias/:id` | `master.categorias` | Eliminar categoría |

---

### 24. Monedas (`monedas`)
* Controlador: [`backend/src/monedas/monedas.controller.ts`](../backend/src/monedas/monedas.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/monedas` | `master.monedas` | Crear moneda |
| **`GET`** | `/api/monedas` | `master.monedas` | Listar monedas |
| **`GET`** | `/api/monedas/:id` | `master.monedas` | Obtener moneda por ID |
| **`PATCH`** | `/api/monedas/:id` | `master.monedas` | Actualizar moneda |
| **`DELETE`** | `/api/monedas/:id` | `master.monedas` | Eliminar moneda |

---

### 25. Tasas de Cambio (`tasas-cambio`)
* Controlador: [`backend/src/tasas-cambio/tasas-cambio.controller.ts`](../backend/src/tasas-cambio/tasas-cambio.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/tasas-cambio` | `master.tasas-cambio` | Registrar nueva tasa de cambio |
| **`GET`** | `/api/tasas-cambio` | `master.tasas-cambio` | Listar tasas de cambio |
| **`GET`** | `/api/tasas-cambio/:id` | `master.tasas-cambio` | Obtener tasa de cambio por ID |
| **`PATCH`** | `/api/tasas-cambio/:id` | `master.tasas-cambio` | Modificar tasa de cambio |
| **`DELETE`** | `/api/tasas-cambio/:id` | `master.tasas-cambio` | Eliminar tasa de cambio |

---

### 26. Métodos de Pago (`metodos-pago`)
* Controlador: [`backend/src/metodos-pago/metodos-pago.controller.ts`](../backend/src/metodos-pago/metodos-pago.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/metodos-pago` | `master.metodos-pago` | Crear método de pago |
| **`GET`** | `/api/metodos-pago` | `master.metodos-pago` | Listar métodos de pago |
| **`GET`** | `/api/metodos-pago/:id` | `master.metodos-pago` | Obtener método de pago por ID |
| **`PATCH`** | `/api/metodos-pago/:id` | `master.metodos-pago` | Actualizar método de pago |
| **`DELETE`** | `/api/metodos-pago/:id` | `master.metodos-pago` | Eliminar método de pago |

---

### 27. Bancos (`bancos`)
* Controlador: [`backend/src/bancos/bancos.controller.ts`](../backend/src/bancos/bancos.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/bancos` | `master.bancos` | Crear entidad bancaria |
| **`GET`** | `/api/bancos` | `master.bancos` | Listar bancos |
| **`GET`** | `/api/bancos/:id` | `master.bancos` | Obtener banco por ID |
| **`PATCH`** | `/api/bancos/:id` | `master.bancos` | Actualizar banco |
| **`DELETE`** | `/api/bancos/:id` | `master.bancos` | Eliminar banco |

---

### 28. Cuentas Bancarias (`cuentas-bancarias`)
* Controlador: [`backend/src/cuentas-bancarias/cuentas-bancarias.controller.ts`](../backend/src/cuentas-bancarias/cuentas-bancarias.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/cuentas-bancarias` | `master.cuentas-bancarias` | Crear cuenta bancaria |
| **`GET`** | `/api/cuentas-bancarias` | `master.cuentas-bancarias` | Listar cuentas bancarias |
| **`GET`** | `/api/cuentas-bancarias/:id` | `master.cuentas-bancarias` | Obtener cuenta bancaria por ID |
| **`PATCH`** | `/api/cuentas-bancarias/:id` | `master.cuentas-bancarias` | Actualizar cuenta bancaria |
| **`DELETE`** | `/api/cuentas-bancarias/:id` | `master.cuentas-bancarias` | Eliminar cuenta bancaria |

---

### 29. Niveles de Precio (`niveles-precio`)
* Controlador: [`backend/src/niveles-precio/niveles-precio.controller.ts`](../backend/src/niveles-precio/niveles-precio.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/niveles-precio` | `master.niveles-precio` | Crear nivel de precio |
| **`GET`** | `/api/niveles-precio` | `master.niveles-precio` | Listar niveles de precio |
| **`GET`** | `/api/niveles-precio/:id` | `master.niveles-precio` | Obtener nivel de precio por ID |
| **`PATCH`** | `/api/niveles-precio/:id` | `master.niveles-precio` | Actualizar nivel de precio |
| **`DELETE`** | `/api/niveles-precio/:id` | `master.niveles-precio` | Eliminar nivel de precio |

---

### 30. Tipos de Documentos (`tipos-documentos`)
* Controlador: [`backend/src/tipos-documentos/tipos-documentos.controller.ts`](../backend/src/tipos-documentos/tipos-documentos.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/tipos-documentos` | `master.tipos-documentos` | Crear tipo de documento correlativo |
| **`GET`** | `/api/tipos-documentos` | `master.tipos-documentos` | Listar tipos de documentos |
| **`GET`** | `/api/tipos-documentos/:id` | `master.tipos-documentos` | Obtener tipo de documento por ID |
| **`PATCH`** | `/api/tipos-documentos/:id` | `master.tipos-documentos` | Actualizar tipo de documento |
| **`DELETE`** | `/api/tipos-documentos/:id` | `master.tipos-documentos` | Eliminar tipo de documento |

---

### 31. Parámetros Fiscales (`parametros-fiscales`)
* Controlador: [`backend/src/parametros-fiscales/parametros-fiscales.controller.ts`](../backend/src/parametros-fiscales/parametros-fiscales.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/parametros-fiscales` | `master.parametros-fiscales` | Crear parámetro fiscal |
| **`GET`** | `/api/parametros-fiscales` | `master.parametros-fiscales` | Listar parámetros fiscales |
| **`GET`** | `/api/parametros-fiscales/:id` | `master.parametros-fiscales` | Obtener parámetro fiscal por ID |
| **`PATCH`** | `/api/parametros-fiscales/:id` | `master.parametros-fiscales` | Actualizar parámetro fiscal |
| **`DELETE`** | `/api/parametros-fiscales/:id` | `master.parametros-fiscales` | Eliminar parámetro fiscal |

---

### 32. Impresoras por Sucursal (`impresoras-sucursal`)
* Controlador: [`backend/src/impresoras-sucursal/impresoras-sucursal.controller.ts`](../backend/src/impresoras-sucursal/impresoras-sucursal.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/impresoras-sucursal` | `master.impresoras` | Registrar impresora para una sucursal |
| **`GET`** | `/api/impresoras-sucursal` | `master.impresoras` | Listar impresoras configuradas |
| **`GET`** | `/api/impresoras-sucursal/:id` | `master.impresoras` | Obtener configuración de impresora |
| **`PATCH`** | `/api/impresoras-sucursal/:id` | `master.impresoras` | Actualizar configuración de impresora |
| **`DELETE`** | `/api/impresoras-sucursal/:id` | `master.impresoras` | Eliminar configuración de impresora |

---

### 33. Usuarios (`usuarios`)
* Controlador: [`backend/src/usuarios/usuarios.controller.ts`](../backend/src/usuarios/usuarios.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/usuarios` | `master.usuarios` | Crear usuario del sistema |
| **`GET`** | `/api/usuarios` | `master.usuarios` | Listar usuarios |
| **`GET`** | `/api/usuarios/:id` | `master.usuarios` | Obtener usuario por ID |
| **`PATCH`** | `/api/usuarios/:id` | `master.usuarios` | Actualizar datos/rol de usuario |
| **`DELETE`** | `/api/usuarios/:id` | `master.usuarios` | Desactivar / eliminar usuario |

---

### 34. Roles (`roles`)
* Controlador: [`backend/src/roles/roles.controller.ts`](../backend/src/roles/roles.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/roles` | `master.roles` | Crear nuevo rol |
| **`GET`** | `/api/roles` | `master.roles` | Listar roles del sistema |
| **`GET`** | `/api/roles/:id` | `master.roles` | Obtener rol por ID |
| **`PATCH`** | `/api/roles/:id` | `master.roles` | Actualizar nombre/descripción del rol |
| **`DELETE`** | `/api/roles/:id` | `master.roles` | Eliminar rol |
| **`POST`** | `/api/roles/:id/permisos` | `master.roles` | Asignar permisos al rol |

---

### 35. Permisos (`permisos`)
* Controlador: [`backend/src/permisos/permisos.controller.ts`](../backend/src/permisos/permisos.controller.ts)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **`GET`** | `/api/permisos` | `master.roles` | Listar catálogo completo de permisos del sistema |

---
