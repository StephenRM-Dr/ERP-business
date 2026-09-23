import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import DashboardLayout from '@/layouts/DashboardLayout.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import { useAuthStore } from '@/modules/auth/auth.store';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    // Module id from config/module-catalog.ts (matches the backend's
    // clave_permiso). Absent means "no extra check beyond being logged in".
    permission?: string;
  }
}

const routes: RouteRecordRaw[] = [
  // --- Auth module (public) ---
  {
    path: '/login',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'Login',
        component: () => import('@/modules/auth/views/LoginView.vue'),
      },
    ],
  },

  // --- Protected application ---
  {
    path: '/',
    component: DashboardLayout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      // --- Dashboard (landing page, no extra permission beyond being logged in) ---
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/modules/dashboard/views/DashboardView.vue'),
      },

      // --- POS / Punto de Venta ---
      {
        path: 'pos',
        name: 'POS',
        meta: { permission: 'invoices' },
        component: () => import('@/modules/invoices/views/InvoiceCreateView.vue'),
      },

      // --- Invoices module ---
      {
        path: 'invoices',
        name: 'InvoicesList',
        meta: { permission: 'invoices' },
        component: () => import('@/modules/invoices/views/InvoicesListView.vue'),
      },
      {
        path: 'invoices/create',
        name: 'InvoiceCreate',
        meta: { permission: 'invoices' },
        component: () => import('@/modules/invoices/views/InvoiceCreateView.vue'),
      },

      // --- Returns module (credit notes for past-day invoices) ---
      {
        path: 'returns',
        name: 'ReturnsList',
        meta: { permission: 'returns' },
        component: () => import('@/modules/returns/views/ReturnsListView.vue'),
      },
      {
        path: 'returns/create',
        name: 'ReturnCreate',
        meta: { permission: 'returns' },
        component: () => import('@/modules/returns/views/ReturnCreateView.vue'),
      },

      // --- Invoicing masters: currencies, bank rates and IGTF ---
      {
        path: 'currencies',
        name: 'Currencies',
        meta: { permission: 'currencies' },
        component: () => import('@/modules/currencies/views/CurrenciesView.vue'),
      },
      {
        path: 'exchange-rates',
        name: 'ExchangeRates',
        meta: { permission: 'exchangeRates' },
        component: () => import('@/modules/currencies/views/ExchangeRatesView.vue'),
      },
      {
        path: 'igtf',
        name: 'IgtfSettings',
        meta: { permission: 'igtf' },
        component: () => import('@/modules/invoices/views/IgtfSettingsView.vue'),
      },

      // --- Inventory module ---
      {
        path: 'inventory',
        name: 'InventoryList',
        meta: { permission: 'inventory.summary' },
        component: () => import('@/modules/inventory/views/InventoryListView.vue'),
      },
      {
        path: 'inventory/categories',
        name: 'InventoryCategoriesList',
        meta: { permission: 'inventory.categories' },
        component: () => import('@/modules/inventory/views/CategoriesListView.vue'),
      },
      {
        path: 'inventory/categories/create',
        name: 'InventoryCategoriesCreate',
        meta: { permission: 'inventory.categories' },
        component: () => import('@/modules/inventory/views/CategoriesCreateView.vue'),
      },
      {
        path: 'inventory/categories/:id/edit',
        name: 'InventoryCategoriesEdit',
        meta: { permission: 'inventory.categories' },
        component: () => import('@/modules/inventory/views/CategoriesEditView.vue'),
      },
      {
        path: 'inventory/products',
        name: 'InventoryProductsList',
        meta: { permission: 'inventory.products' },
        component: () => import('@/modules/inventory/views/ProductsListView.vue'),
      },
      {
        path: 'inventory/products/create',
        name: 'InventoryProductsCreate',
        meta: { permission: 'inventory.products' },
        component: () => import('@/modules/inventory/views/ProductsCreateView.vue'),
      },
      {
        path: 'inventory/products/:id/edit',
        name: 'InventoryProductsEdit',
        meta: { permission: 'inventory.products' },
        component: () => import('@/modules/inventory/views/ProductsEditView.vue'),
      },
      {
        path: 'inventory/prices',
        name: 'InventoryPrices',
        meta: { permission: 'inventory.prices' },
        component: () => import('@/modules/inventory/views/PricesView.vue'),
      },
      {
        path: 'inventory/control',
        name: 'InventoryControl',
        meta: { permission: 'inventory.control' },
        component: () => import('@/modules/inventory/views/InventoryControlView.vue'),
      },
      {
        path: 'inventory/warehouses',
        name: 'InventoryWarehousesList',
        meta: { permission: 'inventory.warehouses' },
        component: () => import('@/modules/inventory/views/WarehousesListView.vue'),
      },
      {
        path: 'inventory/warehouses/create',
        name: 'InventoryWarehousesCreate',
        meta: { permission: 'inventory.warehouses' },
        component: () => import('@/modules/inventory/views/WarehousesCreateView.vue'),
      },
      {
        path: 'inventory/warehouses/:id/edit',
        name: 'InventoryWarehousesEdit',
        meta: { permission: 'inventory.warehouses' },
        component: () => import('@/modules/inventory/views/WarehousesEditView.vue'),
      },
      {
        path: 'inventory/transfers',
        name: 'InventoryTransfersList',
        meta: { permission: 'inventory.transfers' },
        component: () => import('@/modules/inventory/views/TransfersListView.vue'),
      },
      {
        path: 'inventory/transfers/create',
        name: 'InventoryTransfersCreate',
        meta: { permission: 'inventory.transfers' },
        component: () => import('@/modules/inventory/views/TransferCreateView.vue'),
      },
      {
        path: 'inventory/cargos',
        name: 'InventoryCargosList',
        meta: { permission: 'inventory.control' },
        component: () => import('@/modules/inventory/views/CargosListView.vue'),
      },
      {
        path: 'inventory/descargos',
        name: 'InventoryDescargosList',
        meta: { permission: 'inventory.control' },
        component: () => import('@/modules/inventory/views/DescargosListView.vue'),
      },
      {
        path: 'inventory/transformations',
        name: 'InventoryTransformationsList',
        meta: { permission: 'inventario.transformar' },
        component: () => import('@/modules/inventory/views/TransformationsListView.vue'),
      },
      {
        path: 'inventory/transformation-rules',
        name: 'InventoryTransformationRules',
        meta: { permission: 'inventario.verReglas' },
        component: () => import('@/modules/inventory/views/TransformationRulesView.vue'),
      },
      {
        path: 'inventory/transformations/create',
        name: 'InventoryTransformationsCreate',
        meta: { permission: 'inventario.transformar' },
        component: () => import('@/modules/inventory/views/TransformationCreateView.vue'),
      },
      {
        path: 'inventory/kardex',
        name: 'InventoryKardex',
        meta: { permission: 'inventory.control' },
        component: () => import('@/modules/inventory/views/KardexView.vue'),
      },
      {
        path: 'inventory/preliminares',
        name: 'InventoryPreliminaresList',
        meta: { permission: 'inventario.preliminar' },
        component: () => import('@/modules/inventory/views/InventoryPreliminaresListView.vue'),
      },
      {
        path: 'inventory/seriales',
        name: 'InventorySerialesList',
        meta: { permission: 'inventory.seriales' },
        component: () => import('@/modules/inventory/views/SerialesListView.vue'),
      },
      {
        path: 'inventory/seriales/create',
        name: 'InventorySerialesCreate',
        meta: { permission: 'inventory.seriales' },
        component: () => import('@/modules/inventory/views/SerialesCreateView.vue'),
      },
      {
        path: 'inventory/seriales/:id/edit',
        name: 'InventorySerialesEdit',
        meta: { permission: 'inventory.seriales' },
        component: () => import('@/modules/inventory/views/SerialesEditView.vue'),
      },
      {
        path: 'inventory/lotes',
        name: 'InventoryLotesList',
        meta: { permission: 'inventory.lotes' },
        component: () => import('@/modules/inventory/views/LotesListView.vue'),
      },
      {
        path: 'inventory/lotes/create',
        name: 'InventoryLotesCreate',
        meta: { permission: 'inventory.lotes' },
        component: () => import('@/modules/inventory/views/LotesCreateView.vue'),
      },
      {
        path: 'inventory/lotes/:id/edit',
        name: 'InventoryLotesEdit',
        meta: { permission: 'inventory.lotes' },
        component: () => import('@/modules/inventory/views/LotesEditView.vue'),
      },

      // --- Customers module ---
      {
        path: 'customers',
        name: 'CustomersList',
        meta: { permission: 'customers' },
        component: () => import('@/modules/customers/views/CustomersListView.vue'),
      },
      {
        path: 'customers/create',
        name: 'CustomersCreate',
        meta: { permission: 'customers' },
        component: () => import('@/modules/customers/views/CustomersCreateView.vue'),
      },
      {
        path: 'customers/:id/edit',
        name: 'CustomersEdit',
        meta: { permission: 'customers' },
        component: () => import('@/modules/customers/views/CustomersEditView.vue'),
      },

      // --- Master module: bancos, empresas, sucursales, roles, cuentas bancarias, usuarios ---
      {
        path: 'master/bancos',
        name: 'MasterBancosList',
        meta: { permission: 'master.bancos' },
        component: () => import('@/modules/master/bancos/views/BancosListView.vue'),
      },
      {
        path: 'master/bancos/create',
        name: 'MasterBancosCreate',
        meta: { permission: 'master.bancos' },
        component: () => import('@/modules/master/bancos/views/BancosCreateView.vue'),
      },
      {
        path: 'master/bancos/:id/edit',
        name: 'MasterBancosEdit',
        meta: { permission: 'master.bancos' },
        component: () => import('@/modules/master/bancos/views/BancosEditView.vue'),
      },
      {
        path: 'master/empresas',
        name: 'MasterEmpresasList',
        meta: { permission: 'master.empresas' },
        component: () => import('@/modules/master/empresas/views/EmpresasListView.vue'),
      },
      {
        path: 'master/empresas/create',
        name: 'MasterEmpresasCreate',
        meta: { permission: 'master.empresas' },
        component: () => import('@/modules/master/empresas/views/EmpresasCreateView.vue'),
      },
      {
        path: 'master/empresas/:id/edit',
        name: 'MasterEmpresasEdit',
        meta: { permission: 'master.empresas' },
        component: () => import('@/modules/master/empresas/views/EmpresasEditView.vue'),
      },
      {
        path: 'master/sucursales',
        name: 'MasterSucursalesList',
        meta: { permission: 'master.sucursales' },
        component: () => import('@/modules/master/sucursales/views/SucursalesListView.vue'),
      },
      {
        path: 'master/sucursales/create',
        name: 'MasterSucursalesCreate',
        meta: { permission: 'master.sucursales' },
        component: () => import('@/modules/master/sucursales/views/SucursalesCreateView.vue'),
      },
      {
        path: 'master/sucursales/:id/edit',
        name: 'MasterSucursalesEdit',
        meta: { permission: 'master.sucursales' },
        component: () => import('@/modules/master/sucursales/views/SucursalesEditView.vue'),
      },
      {
        path: 'master/roles',
        name: 'MasterRolesList',
        meta: { permission: 'master.roles' },
        component: () => import('@/modules/master/roles/views/RolesListView.vue'),
      },
      {
        path: 'master/roles/create',
        name: 'MasterRolesCreate',
        meta: { permission: 'master.roles' },
        component: () => import('@/modules/master/roles/views/RolesCreateView.vue'),
      },
      {
        path: 'master/roles/:id/edit',
        name: 'MasterRolesEdit',
        meta: { permission: 'master.roles' },
        component: () => import('@/modules/master/roles/views/RolesEditView.vue'),
      },
      {
        path: 'master/cuentas-bancarias',
        name: 'MasterCuentasBancariasList',
        meta: { permission: 'master.cuentasBancarias' },
        component: () => import('@/modules/master/cuentas-bancarias/views/CuentasBancariasListView.vue'),
      },
      {
        path: 'master/cuentas-bancarias/create',
        name: 'MasterCuentasBancariasCreate',
        meta: { permission: 'master.cuentasBancarias' },
        component: () => import('@/modules/master/cuentas-bancarias/views/CuentasBancariasCreateView.vue'),
      },
      {
        path: 'master/cuentas-bancarias/:id/edit',
        name: 'MasterCuentasBancariasEdit',
        meta: { permission: 'master.cuentasBancarias' },
        component: () => import('@/modules/master/cuentas-bancarias/views/CuentasBancariasEditView.vue'),
      },
      {
        path: 'master/usuarios',
        name: 'MasterUsuariosList',
        meta: { permission: 'master.usuarios' },
        component: () => import('@/modules/master/usuarios/views/UsuariosListView.vue'),
      },
      {
        path: 'master/usuarios/create',
        name: 'MasterUsuariosCreate',
        meta: { permission: 'master.usuarios' },
        component: () => import('@/modules/master/usuarios/views/UsuariosCreateView.vue'),
      },
      {
        path: 'master/usuarios/:id/edit',
        name: 'MasterUsuariosEdit',
        meta: { permission: 'master.usuarios' },
        component: () => import('@/modules/master/usuarios/views/UsuariosEditView.vue'),
      },
      {
        path: 'master/reports',
        alias: ['reports', 'informes'],
        name: 'MasterReports',
        meta: { permission: 'master.informes' },
        component: () => import('@/modules/reports/views/ReportsView.vue'),
      },
      {
        path: 'master/parametros',
        name: 'MasterParametrosList',
        meta: { permission: 'master.parametros' },
        component: () => import('@/modules/master/parametros/views/ParametrosListView.vue'),
      },
      {
        path: 'master/parametros/create',
        name: 'MasterParametrosCreate',
        meta: { permission: 'master.parametros' },
        component: () => import('@/modules/master/parametros/views/ParametrosCreateView.vue'),
      },
      {
        path: 'master/parametros/:id/edit',
        name: 'MasterParametrosEdit',
        meta: { permission: 'master.parametros' },
        component: () => import('@/modules/master/parametros/views/ParametrosEditView.vue'),
      },
      {
        path: 'master/metodos-pago',
        name: 'MasterMetodosPagoList',
        meta: { permission: 'configuracion.metodos_pago' },
        component: () => import('@/modules/master/metodos-pago/views/MetodosPagoListView.vue'),
      },
      {
        path: 'master/metodos-pago/create',
        name: 'MasterMetodosPagoCreate',
        meta: { permission: 'configuracion.metodos_pago' },
        component: () => import('@/modules/master/metodos-pago/views/MetodosPagoCreateView.vue'),
      },
      {
        path: 'master/metodos-pago/:id/edit',
        name: 'MasterMetodosPagoEdit',
        meta: { permission: 'configuracion.metodos_pago' },
        component: () => import('@/modules/master/metodos-pago/views/MetodosPagoEditView.vue'),
      },
      {
        path: 'master/vendedores',
        name: 'MasterVendedoresList',
        meta: { permission: 'master.vendedores' },
        component: () => import('@/modules/master/vendedores/views/VendedoresListView.vue'),
      },
      {
        path: 'master/vendedores/create',
        name: 'MasterVendedoresCreate',
        meta: { permission: 'master.vendedores' },
        component: () => import('@/modules/master/vendedores/views/VendedoresCreateView.vue'),
      },
      {
        path: 'master/vendedores/:id/edit',
        name: 'MasterVendedoresEdit',
        meta: { permission: 'master.vendedores' },
        component: () => import('@/modules/master/vendedores/views/VendedoresEditView.vue'),
      },
      {
        path: 'master/proveedores',
        name: 'MasterProveedoresList',
        meta: { permission: 'master.proveedores' },
        component: () => import('@/modules/master/proveedores/views/ProveedoresListView.vue'),
      },
      {
        path: 'master/proveedores/create',
        name: 'MasterProveedoresCreate',
        meta: { permission: 'master.proveedores' },
        component: () => import('@/modules/master/proveedores/views/ProveedoresCreateView.vue'),
      },
      {
        path: 'master/proveedores/:id/edit',
        name: 'MasterProveedoresEdit',
        meta: { permission: 'master.proveedores' },
        component: () => import('@/modules/master/proveedores/views/ProveedoresEditView.vue'),
      },
      {
        path: 'cuentas-cobrar',
        name: 'CuentasCobrar',
        meta: { permission: 'recibos.cobro' },
        component: () => import('@/modules/cuentas-cobrar/views/CuentasCobrarView.vue'),
      },
      {
        path: 'cuentas-pagar',
        name: 'CuentasPagarList',
        meta: { permission: 'cuentas.pagar' },
        component: () => import('@/modules/cuentas-pagar/views/CuentasPagarListView.vue'),
      },
      {
        path: 'recibos-cobro',
        name: 'RecibosCobroList',
        meta: { permission: 'recibos.cobro' },
        component: () => import('@/modules/recibos-cobro/views/RecibosCobroListView.vue'),
      },
      {
        path: 'recibos-cobro/create',
        name: 'RecibosCobroCreate',
        meta: { permission: 'recibos.cobro' },
        component: () => import('@/modules/recibos-cobro/views/RecibosCobroCreateView.vue'),
      },
      {
        path: 'pagos-proveedores',
        name: 'PagosProveedoresList',
        meta: { permission: 'pagos.proveedores' },
        component: () => import('@/modules/pagos-proveedores/views/PagosProveedoresListView.vue'),
      },
      {
        path: 'pagos-proveedores/create',
        name: 'PagosProveedoresCreate',
        meta: { permission: 'pagos.proveedores' },
        component: () => import('@/modules/pagos-proveedores/views/PagosProveedoresCreateView.vue'),
      },
      {
        path: 'compras',
        name: 'ComprasList',
        meta: { permission: 'compras' },
        component: () => import('@/modules/compras/views/ComprasListView.vue'),
      },
      {
        path: 'compras/create',
        name: 'ComprasCreate',
        meta: { permission: 'compras' },
        component: () => import('@/modules/compras/views/ComprasCreateView.vue'),
      },
      {
        path: 'master/tipos-documentos',
        name: 'MasterTiposDocumentosList',
        meta: { permission: 'master.tiposDocumentos' },
        component: () => import('@/modules/master/tipos-documentos/views/TiposDocumentosListView.vue'),
      },
      {
        path: 'master/tipos-documentos/create',
        name: 'MasterTiposDocumentosCreate',
        meta: { permission: 'master.tiposDocumentos' },
        component: () => import('@/modules/master/tipos-documentos/views/TiposDocumentosCreateView.vue'),
      },
      {
        path: 'master/tipos-documentos/:id/edit',
        name: 'MasterTiposDocumentosEdit',
        meta: { permission: 'master.tiposDocumentos' },
        component: () => import('@/modules/master/tipos-documentos/views/TiposDocumentosEditView.vue'),
      },
      // --- Módulo de Anulación de Documentos (Individual y por Lote) ---
      {
        path: 'anulaciones',
        name: 'Anulaciones',
        meta: { permission: 'transacciones.anulaciones' },
        component: () => import('@/modules/anulaciones/views/AnulacionesView.vue'),
      },
      // --- Restablecer Sistema / Reset de Fábrica (Solo Administradores) ---
      {
        path: 'system/restablecer',
        name: 'RestablecerSistema',
        meta: { permission: 'master.usuarios' },
        component: () => import('@/modules/master/sistema/views/RestablecerSistemaView.vue'),
      },
    ],
  },

  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Global auth guard. The store is resolved inside the callback because Pinia
// is not installed yet when this module is first evaluated.
router.beforeEach((to) => {
  const authStore = useAuthStore();

  // `to.meta` merges parent route meta, so every child of the dashboard is covered.
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } };
  }

  if (to.name === 'Login' && authStore.isAuthenticated) {
    return { path: '/' };
  }

  if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
    return { name: 'Forbidden' };
  }

  return true;
});

export default router;
