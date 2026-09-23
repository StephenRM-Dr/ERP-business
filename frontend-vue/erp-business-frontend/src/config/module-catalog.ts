/**
 * Fixed catalog of module identifiers used by the role-permission system:
 * each entry is a stable id a role's `modulosPermitidos` can reference,
 * paired with the i18n key already used for its sidebar label. Leaf ids
 * match a `clave_permiso` in the backend `permisos` table (see
 * backend/sql/seed_permisos.sql).
 *
 * Entries with `children` are UI-only groups, nestable to any depth: granting
 * the parent id is what reveals its children in the permission picker
 * (RolForm.vue / ModulePermissionNode.vue) — e.g. checking "Mantenimiento" is
 * what lets you then pick which of Productos, Bancos, Usuarios, etc. that
 * role can access. Group ids (e.g. "maintenance", "transactions.suppliers")
 * have no matching permiso and are dropped when the selection is sent to the
 * API (see permisoIdsFromClaves in permiso.store.ts).
 *
 * The tree here mirrors the visual navigation grouping (see
 * layouts/DashboardLayout.vue) — Mantenimiento / Transacciones / Ventas /
 * Compras / Informes / Sistema — but the two are read independently: a leaf
 * id with no route wired in router/index.ts simply won't render as a
 * sidebar link, even though it still exists here for the Roles picker.
 */

export interface ModuleCatalogEntry {
  id: string;
  labelKey: string;
  children?: ModuleCatalogEntry[];
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  // Not a screen — cross-module action permission (facturas, control de
  // inventario) checked wherever a list would otherwise be scoped to the
  // user's own sucursal. Top level since it isn't tied to any one route.
  { id: 'general.viewAllLocations', labelKey: 'sidebar.generalViewAllLocations' },
  // Not a screen — an action-level permission checked inside POST /facturas.
  // Lives at the top level (not under a group) since it isn't tied to any route.
  { id: 'invoices.sellWithoutStock', labelKey: 'sidebar.invoicesSellWithoutStock' },
  {
    id: 'maintenance',
    labelKey: 'sidebar.maintenance',
    children: [
      { id: 'inventory.summary', labelKey: 'sidebar.inventorySummary' },
      { id: 'inventory.products', labelKey: 'sidebar.inventoryProducts' },
      { id: 'inventory.categories', labelKey: 'sidebar.inventoryCategories' },
      { id: 'inventory.warehouses', labelKey: 'sidebar.inventoryWarehouses' },
      { id: 'customers', labelKey: 'sidebar.customers' },
      { id: 'master.vendedores', labelKey: 'sidebar.masterVendedores' },
      { id: 'configuracion.metodos_pago', labelKey: 'sidebar.masterMetodosPago' },
      { id: 'master.proveedores', labelKey: 'sidebar.masterProveedores' },
      { id: 'currencies', labelKey: 'sidebar.currencies' },
      {
        id: 'maintenance.bancos',
        labelKey: 'sidebar.banksGroup',
        children: [
          { id: 'master.bancos', labelKey: 'sidebar.masterBancos' },
          { id: 'master.cuentasBancarias', labelKey: 'sidebar.masterCuentasBancarias' },
        ],
      },
      { id: 'master.empresas', labelKey: 'sidebar.masterEmpresas' },
      { id: 'master.sucursales', labelKey: 'sidebar.masterSucursales' },
      { id: 'master.impresoras', labelKey: 'sidebar.masterImpresoras' },
    ],
  },
  {
    id: 'transactions',
    labelKey: 'sidebar.transactions',
    children: [
      {
        id: 'transactions.inventory',
        labelKey: 'sidebar.inventory',
        children: [
          { id: 'inventory.transfers', labelKey: 'sidebar.inventoryTransfers' },
          { id: 'inventory.cargos', labelKey: 'sidebar.inventoryCargos' },
          { id: 'inventory.descargos', labelKey: 'sidebar.inventoryDescargos' },
          { id: 'inventory.kardex', labelKey: 'sidebar.inventoryKardex' },
          { id: 'inventory.control', labelKey: 'sidebar.inventoryControl' },
          { id: 'inventory.prices', labelKey: 'sidebar.inventoryPrices' },
          // clave_permiso reales del backend (@RequirePermission en inventario.controller.ts):
          // no confundir con el prefijo "inventory." que usa el resto de este catálogo.
          { id: 'inventario.verReglas', labelKey: 'sidebar.inventoryTransformationRules' },
          { id: 'inventario.transformar', labelKey: 'sidebar.inventoryTransformations' },
          { id: 'inventario.admin', labelKey: 'sidebar.inventoryTransformationRulesAdmin' },
          { id: 'inventario.preliminar', labelKey: 'sidebar.inventoryInventoryPreliminares' },
          { id: 'inventario.nacional', labelKey: 'sidebar.inventoryNacional' },
        ],
      },
      {
        id: 'transactions.clients',
        labelKey: 'sidebar.clientsGroup',
        children: [
          { id: 'cuentas.cobrar', labelKey: 'sidebar.cuentasCobrar' },
          { id: 'recibos.cobro', labelKey: 'sidebar.collectionReceipts' },
        ],
      },
      {
        id: 'transactions.suppliers',
        labelKey: 'sidebar.suppliersGroup',
        children: [
          { id: 'cuentas.pagar', labelKey: 'sidebar.payables' },
          { id: 'pagos.proveedores', labelKey: 'sidebar.supplierPayments' },
        ],
      },
      { id: 'inventory.seriales', labelKey: 'sidebar.inventorySeriales' },
      { id: 'inventory.lotes', labelKey: 'sidebar.inventoryLotes' },
      { id: 'transacciones.anulaciones', labelKey: 'sidebar.documentCancellations' },
    ],
  },
  {
    id: 'sales',
    labelKey: 'sidebar.sales',
    children: [
      { id: 'invoices', labelKey: 'sidebar.invoicesList' },
      { id: 'invoices.priceNational', labelKey: 'sidebar.invoicesPriceNational' },
      { id: 'invoices.priceLocal', labelKey: 'sidebar.invoicesPriceLocal' },
      { id: 'invoices.editPrice', labelKey: 'sidebar.invoicesEditPrice' },
      { id: 'returns', labelKey: 'sidebar.returns' },
    ],
  },
  {
    id: 'purchasesGroup',
    labelKey: 'sidebar.purchases',
    children: [
      { id: 'compras', labelKey: 'sidebar.comprasList' },
    ],
  },
  {
    id: 'workshop',
    labelKey: 'sidebar.workshop',
    children: [
      { id: 'corte', labelKey: 'sidebar.corte' },
    ],
  },
  {
    id: 'reports',
    labelKey: 'sidebar.reports',
    children: [
      { id: 'master.informes', labelKey: 'sidebar.masterInformes' },
    ],
  },
  {
    id: 'system',
    labelKey: 'sidebar.system',
    children: [
      { id: 'exchangeRates', labelKey: 'sidebar.exchangeRates' },
      { id: 'igtf', labelKey: 'sidebar.igtf' },
      { id: 'master.tiposDocumentos', labelKey: 'sidebar.masterTiposDocumentos' },
      { id: 'master.parametros', labelKey: 'sidebar.masterParametros' },
      { id: 'master.usuarios', labelKey: 'sidebar.masterUsuarios' },
      { id: 'master.roles', labelKey: 'sidebar.masterRoles' },
      { id: 'system.restablecer', labelKey: 'sidebar.restablecerSistema' },
    ],
  },
];

/** Flattens the tree into a single list — used to look up a label by id. */
export function flattenModuleCatalog(
  entries: ModuleCatalogEntry[] = MODULE_CATALOG,
): ModuleCatalogEntry[] {
  return entries.flatMap((entry) => [
    entry,
    ...(entry.children ? flattenModuleCatalog(entry.children) : []),
  ]);
}

/**
 * All descendant ids under `entry` (any depth), not including itself. Used to
 * cascade-clear a group's own selection when the group gets unchecked, so no
 * permission stays granted "invisibly" once its parent group is hidden.
 */
export function collectDescendantIds(entry: ModuleCatalogEntry): string[] {
  if (!entry.children) return [];
  return entry.children.flatMap((child) => [child.id, ...collectDescendantIds(child)]);
}
