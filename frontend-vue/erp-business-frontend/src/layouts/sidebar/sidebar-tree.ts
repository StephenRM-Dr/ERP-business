/**
 * Visual navigation tree for DashboardLayout's sidebar. Deliberately separate
 * from config/module-catalog.ts (the permission picker's tree): a leaf here
 * needs an actual route to be worth showing, while the permission catalog
 * must list every clave_permiso whether or not a screen exists yet for it.
 * See module-catalog.ts's top comment for the full rationale.
 *
 * Add a leaf here only once its route exists in router/index.ts — a group
 * with zero visible children (checked via hasPermission) is dropped
 * entirely by filterSidebarTree, so wiring up a new screen later is just
 * appending one line to the right group's `children`.
 */

export interface SidebarLeaf {
  labelKey: string;
  route: string;
  permission: string;
  icon?: string;
}

export interface SidebarGroup {
  labelKey: string;
  children: SidebarEntry[];
  icon?: string;
}

export type SidebarEntry = SidebarLeaf | SidebarGroup;

export function isSidebarGroup(entry: SidebarEntry): entry is SidebarGroup {
  return 'children' in entry;
}

export const SIDEBAR_TREE: SidebarEntry[] = [
  {
    labelKey: 'sidebar.maintenance',
    icon: '⚙️',
    children: [
      { labelKey: 'sidebar.inventorySummary', route: '/inventory', permission: 'inventory.summary', icon: '📦' },
      { labelKey: 'sidebar.inventoryProducts', route: '/inventory/products', permission: 'inventory.products', icon: '🏷️' },
      { labelKey: 'sidebar.inventoryCategories', route: '/inventory/categories', permission: 'inventory.categories', icon: '📑' },
      { labelKey: 'sidebar.inventoryWarehouses', route: '/inventory/warehouses', permission: 'inventory.warehouses', icon: '🏬' },
      { labelKey: 'sidebar.customers', route: '/customers', permission: 'customers', icon: '👥' },
      { labelKey: 'sidebar.masterVendedores', route: '/master/vendedores', permission: 'master.vendedores', icon: '👔' },
      { labelKey: 'sidebar.masterMetodosPago', route: '/master/metodos-pago', permission: 'configuracion.metodos_pago', icon: '💳' },
      { labelKey: 'sidebar.masterProveedores', route: '/master/proveedores', permission: 'master.proveedores', icon: '🚚' },
      { labelKey: 'sidebar.currencies', route: '/currencies', permission: 'currencies', icon: '💱' },
      {
        labelKey: 'sidebar.banksGroup',
        icon: '🏦',
        children: [
          { labelKey: 'sidebar.masterBancos', route: '/master/bancos', permission: 'master.bancos', icon: '🏛️' },
          { labelKey: 'sidebar.masterCuentasBancarias', route: '/master/cuentas-bancarias', permission: 'master.cuentasBancarias', icon: '🏧' },
        ],
      },
      { labelKey: 'sidebar.masterEmpresas', route: '/master/empresas', permission: 'master.empresas', icon: '🏢' },
      { labelKey: 'sidebar.masterSucursales', route: '/master/sucursales', permission: 'master.sucursales', icon: '🏪' },
    ],
  },
  {
    labelKey: 'sidebar.transactions',
    icon: '🔄',
    children: [
      {
        labelKey: 'sidebar.inventory',
        icon: '📦',
        children: [
          { labelKey: 'sidebar.inventoryTransfers', route: '/inventory/transfers', permission: 'inventory.transfers', icon: '🔁' },
          { labelKey: 'sidebar.inventoryCargos', route: '/inventory/cargos', permission: 'inventory.control', icon: '📥' },
          { labelKey: 'sidebar.inventoryDescargos', route: '/inventory/descargos', permission: 'inventory.control', icon: '📤' },
          { labelKey: 'sidebar.inventoryControl', route: '/inventory/control', permission: 'inventory.control', icon: '📋' },
          { labelKey: 'sidebar.inventoryPrices', route: '/inventory/prices', permission: 'inventory.prices', icon: '💲' },
          { labelKey: 'sidebar.inventoryTransformations', route: '/inventory/transformations', permission: 'inventario.transformar', icon: '✂️' },
          { labelKey: 'sidebar.inventoryTransformationRules', route: '/inventory/transformation-rules', permission: 'inventario.verReglas', icon: '📐' },
          { labelKey: 'sidebar.inventoryInventoryPreliminares', route: '/inventory/preliminares', permission: 'inventario.preliminar', icon: '📝' },
        ],
      },
      {
        labelKey: 'sidebar.clientsGroup',
        icon: '👥',
        children: [
          { labelKey: 'sidebar.cuentasCobrar', route: '/cuentas-cobrar', permission: 'recibos.cobro', icon: '💳' },
          { labelKey: 'sidebar.collectionReceipts', route: '/recibos-cobro', permission: 'recibos.cobro', icon: '🧾' },
        ],
      },
      {
        labelKey: 'sidebar.suppliersGroup',
        icon: '🚚',
        children: [
          { labelKey: 'sidebar.payables', route: '/cuentas-pagar', permission: 'cuentas.pagar', icon: '💰' },
          { labelKey: 'sidebar.supplierPayments', route: '/pagos-proveedores', permission: 'pagos.proveedores', icon: '💸' },
        ],
      },
      { labelKey: 'sidebar.inventorySeriales', route: '/inventory/seriales', permission: 'inventory.seriales', icon: '🔢' },
      { labelKey: 'sidebar.inventoryLotes', route: '/inventory/lotes', permission: 'inventory.lotes', icon: '🗃️' },
      { labelKey: 'sidebar.documentCancellations', route: '/anulaciones', permission: 'transacciones.anulaciones', icon: '🚫' },
    ],
  },
  {
    labelKey: 'sidebar.sales',
    icon: '🛒',
    children: [
      { labelKey: 'sidebar.posTerminal', route: '/pos', permission: 'invoices', icon: '🖥️' },
      { labelKey: 'sidebar.invoicesList', route: '/invoices', permission: 'invoices', icon: '📑' },
      { labelKey: 'sidebar.newSale', route: '/invoices/create', permission: 'invoices', icon: '⚡' },
      { labelKey: 'sidebar.returns', route: '/returns', permission: 'returns', icon: '↩️' },
    ],
  },
  {
    labelKey: 'sidebar.purchases',
    icon: '🛍️',
    children: [
      { labelKey: 'sidebar.comprasList', route: '/compras', permission: 'compras', icon: '📥' },
    ],
  },
  {
    labelKey: 'sidebar.reports',
    icon: '📊',
    children: [
      {
        labelKey: 'sidebar.repInventario',
        icon: '📦',
        children: [
          { labelKey: 'sidebar.repInvGeneral', route: '/master/reports?tab=inv_general', permission: 'master.informes', icon: '📋' },
          { labelKey: 'sidebar.repInvKardex', route: '/master/reports?tab=inv_kardex', permission: 'master.informes', icon: '📜' },
          { labelKey: 'sidebar.repInvStockBajo', route: '/master/reports?tab=inv_stock_bajo_tienda', permission: 'master.informes', icon: '📉' },
          { labelKey: 'sidebar.repInvFisico', route: '/master/reports?tab=inv_fisico', permission: 'master.informes', icon: '🗂️' },
          { labelKey: 'sidebar.repInvReposicion', route: '/master/reports?tab=inv_reposicion', permission: 'master.informes', icon: '📦' },
          { labelKey: 'sidebar.repInvPrecios', route: '/master/reports?tab=inv_precios', permission: 'master.informes', icon: '💲' },
          { labelKey: 'sidebar.repInvOfertas', route: '/master/reports?tab=inv_ofertas', permission: 'master.informes', icon: '🏷️' },
          { labelKey: 'sidebar.repInvRentabilidad', route: '/master/reports?tab=inv_rentabilidad', permission: 'master.informes', icon: '📊' },
          { labelKey: 'sidebar.repInvSinMovimiento', route: '/master/reports?tab=inv_sin_movimiento', permission: 'master.informes', icon: '⏳' },
        ],
      },
      {
        labelKey: 'sidebar.repOperaciones',
        icon: '⚙️',
        children: [
          { labelKey: 'sidebar.repOpsOperaciones', route: '/master/reports?tab=ops_operaciones', permission: 'master.informes', icon: '🔄' },
          { labelKey: 'sidebar.repOpsProductos', route: '/master/reports?tab=ops_operaciones_productos', permission: 'master.informes', icon: '📦' },
        ],
      },
      {
        labelKey: 'sidebar.repClientes',
        icon: '👥',
        children: [
          { labelKey: 'sidebar.repCliGeneral', route: '/master/reports?tab=cli_general', permission: 'master.informes', icon: '📋' },
          { labelKey: 'sidebar.repCliCxcTienda', route: '/master/reports?tab=cli_cxc_tienda', permission: 'master.informes', icon: '🏪' },
          { labelKey: 'sidebar.repCliEstadoCuenta', route: '/master/reports?tab=cli_estado_cuenta', permission: 'master.informes', icon: '📜' },
          { labelKey: 'sidebar.repCliCuentasCobrar', route: '/master/reports?tab=cli_cuentas_cobrar', permission: 'master.informes', icon: '💳' },
          { labelKey: 'sidebar.repCliVencimientos', route: '/master/reports?tab=cli_analisis_vencimientos', permission: 'master.informes', icon: '📅' },
          { labelKey: 'sidebar.repCliRelacionCobros', route: '/master/reports?tab=cli_relacion_cobros', permission: 'master.informes', icon: '🧾' },
          { labelKey: 'sidebar.repCliRetencion', route: '/master/reports?tab=cli_retencion', permission: 'master.informes', icon: '⚖️' },
        ],
      },
      {
        labelKey: 'sidebar.repProveedores',
        icon: '🚚',
        children: [
          { labelKey: 'sidebar.repProvGeneral', route: '/master/reports?tab=prov_general', permission: 'master.informes', icon: '📋' },
        ],
      },
      {
        labelKey: 'sidebar.repVentas',
        icon: '🛒',
        children: [
          { labelKey: 'sidebar.repVenDiario', route: '/master/reports?tab=ven_diario', permission: 'master.informes', icon: '📋' },
          { labelKey: 'sidebar.repVenResumen', route: '/master/reports?tab=ven_resumen', permission: 'master.informes', icon: '📊' },
          { labelKey: 'sidebar.repVenPorTienda', route: '/master/reports?tab=ven_por_tienda', permission: 'master.informes', icon: '🏢' },
          { labelKey: 'sidebar.repVenPorVendedor', route: '/master/reports?tab=ven_por_vendedor', permission: 'master.informes', icon: '👔' },
        ],
      },
      {
        labelKey: 'sidebar.repCompras',
        icon: '🛍️',
        children: [
          { labelKey: 'sidebar.repComResumen', route: '/master/reports?tab=com_resumen', permission: 'master.informes', icon: '📥' },
        ],
      },
      {
        labelKey: 'sidebar.repResumenes',
        icon: '📊',
        children: [
          { labelKey: 'sidebar.repResGeneral', route: '/master/reports?tab=res_general', permission: 'master.informes', icon: '📊' },
          { labelKey: 'sidebar.repResVentasTienda', route: '/master/reports?tab=res_ventas_tienda', permission: 'master.informes', icon: '🏢' },
        ],
      },
    ],
  },
  {
    labelKey: 'sidebar.system',
    icon: '🛠️',
    children: [
      { labelKey: 'sidebar.exchangeRates', route: '/exchange-rates', permission: 'exchangeRates', icon: '📈' },
      { labelKey: 'sidebar.igtf', route: '/igtf', permission: 'igtf', icon: '⚖️' },
      { labelKey: 'sidebar.masterTiposDocumentos', route: '/master/tipos-documentos', permission: 'master.tiposDocumentos', icon: '📄' },
      { labelKey: 'sidebar.masterParametros', route: '/master/parametros', permission: 'master.parametros', icon: '⚙️' },
      { labelKey: 'sidebar.masterUsuarios', route: '/master/usuarios', permission: 'master.usuarios', icon: '👤' },
      { labelKey: 'sidebar.masterRoles', route: '/master/roles', permission: 'master.roles', icon: '🛡️' },
      { labelKey: 'sidebar.restablecerSistema', route: '/system/restablecer', permission: 'master.usuarios', icon: '🚨' },
    ],
  },
];

/**
 * Recursively drops leaves the user lacks permission for, then drops any
 * group left with zero children. A group's own visibility never depends on
 * a permission of its own — only on whether anything under it survived.
 */
export function filterSidebarTree(
  entries: SidebarEntry[],
  hasPermission: (permission: string) => boolean,
): SidebarEntry[] {
  return entries.reduce<SidebarEntry[]>((visible, entry) => {
    if (isSidebarGroup(entry)) {
      const children = filterSidebarTree(entry.children, hasPermission);
      if (children.length > 0) visible.push({ ...entry, children });
      return visible;
    }

    if (hasPermission(entry.permission)) visible.push(entry);
    return visible;
  }, []);
}
