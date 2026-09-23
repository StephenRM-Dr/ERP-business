<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import apiClient from '@/api/axios-client';
import ProductSearchSelect from '@/modules/inventory/components/ProductSearchSelect.vue';
import { useProductStore } from '@/modules/inventory/interfaces/product.store';
import { useStockStore } from '@/modules/inventory/interfaces/stock.store';
import { useWarehouseStore } from '@/modules/inventory/interfaces/warehouse.store';
import { useCustomerStore } from '@/modules/customers/interfaces/customer.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { exportToCsv } from '@/utils/csv-export';
import { useSucursalStore } from '@/modules/master/sucursales/interfaces/sucursal.store';
import { useAccountsReceivableStore } from '../interfaces/accounts-receivable.store';
import { useSalesReportStore } from '../interfaces/sales-report.store';
import { useVendedorStore } from '@/modules/master/vendedores/interfaces/vendedor.store';
import type { KardexRow } from '@/modules/inventory/views/KardexView.vue';
import DailySalesReport from '../components/DailySalesReport.vue';

// ─── Stores ────────────────────────────────────────────────────────────────────
const currenciesStore = useCurrenciesStore();
const customerStore = useCustomerStore();
const productStore = useProductStore();
const stockStore = useStockStore();
const warehouseStore = useWarehouseStore();
const sucursalStore = useSucursalStore();
const salesReportStore = useSalesReportStore();
const accountsReceivableStore = useAccountsReceivableStore();
const vendedorStore = useVendedorStore();

// ─── Navigation State ──────────────────────────────────────────────────────────
type ReportId =
  | 'inv_kardex'
  | 'inv_general'
  | 'inv_fisico'
  | 'inv_stock_bajo_tienda'
  | 'inv_reposicion'
  | 'inv_precios'
  | 'inv_ofertas'
  | 'inv_operaciones'
  | 'inv_rentabilidad'
  | 'inv_sin_movimiento'
  | 'ops_operaciones'
  | 'ops_operaciones_productos'
  | 'cli_general'
  | 'cli_cxc_tienda'
  | 'cli_estado_cuenta'
  | 'cli_cuentas_cobrar'
  | 'cli_analisis_vencimientos'
  | 'cli_relacion_cobros'
  | 'cli_retencion'
  | 'prov_general'
  | 'ven_diario'
  | 'ven_resumen'
  | 'ven_por_tienda'
  | 'ven_por_vendedor'
  | 'com_resumen'
  | 'res_general'
  | 'res_ventas_tienda';

interface NavSubItem {
  id: ReportId;
  label: string;
}

interface NavCategory {
  id: string;
  label: string;
  icon: string;
  children: NavSubItem[];
}

const navCategories: NavCategory[] = [
  {
    id: 'inventario',
    label: 'Inventario',
    icon: '📦',
    children: [
      { id: 'inv_general', label: 'Reporte General' },
      { id: 'inv_kardex', label: 'Movimiento de Unidades' },
      { id: 'inv_stock_bajo_tienda', label: 'Stock Bajo por Tienda y Depósito' },
      { id: 'inv_fisico', label: 'Inventario Físico' },
      { id: 'inv_reposicion', label: 'Reposición de Inventario' },
      { id: 'inv_precios', label: 'Lista de Precios' },
      { id: 'inv_ofertas', label: 'Ofertas y Presentaciones' },
      { id: 'inv_operaciones', label: 'Operaciones de Inventario' },
      { id: 'inv_rentabilidad', label: 'Rentabilidad de Productos' },
      { id: 'inv_sin_movimiento', label: 'Productos sin movimiento' },
    ],
  },
  {
    id: 'operaciones',
    label: 'Operaciones de Inventario',
    icon: '⚙️',
    children: [
      { id: 'ops_operaciones', label: 'Operaciones' },
      { id: 'ops_operaciones_productos', label: 'Operaciones con productos' },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: '👥',
    children: [
      { id: 'cli_general', label: 'General de Clientes' },
      { id: 'cli_cxc_tienda', label: 'Cuentas por Cobrar por Tienda' },
      { id: 'cli_estado_cuenta', label: 'Estado de cuenta' },
      { id: 'cli_cuentas_cobrar', label: 'Cuentas por cobrar' },
      { id: 'cli_analisis_vencimientos', label: 'Análisis de Vencimientos' },
      { id: 'cli_relacion_cobros', label: 'Relación de cobros' },
      { id: 'cli_retencion', label: 'Retención de Impuestos' },
    ],
  },
  {
    id: 'proveedores',
    label: 'Proveedores',
    icon: '🚚',
    children: [
      { id: 'prov_general', label: 'General de Proveedores' },
    ],
  },
  {
    id: 'ventas',
    label: 'Ventas',
    icon: '🛒',
    children: [
      { id: 'ven_diario', label: 'Ventas Diarias (Cierre / Operaciones)' },
      { id: 'ven_resumen', label: 'Resumen General de Ventas' },
      { id: 'ven_por_tienda', label: 'Ventas por Tienda (Diario / Fechas)' },
      { id: 'ven_por_vendedor', label: 'Ventas por Vendedor' },
    ],
  },
  {
    id: 'compras',
    label: 'Compras',
    icon: '🛍️',
    children: [
      { id: 'com_resumen', label: 'Resumen de Compras' },
    ],
  },
  {
    id: 'resumenes',
    label: 'Resúmenes',
    icon: '📊',
    children: [
      { id: 'res_general', label: 'Resumen General' },
      { id: 'res_ventas_tienda', label: 'Resumen de Ventas por Tienda' },
    ],
  },
];

const route = useRoute();

const activeReport = ref<ReportId>('ven_diario');

watch(
  () => route.query.tab,
  (tab) => {
    if (tab && typeof tab === 'string') {
      activeReport.value = tab as ReportId;
    }
  },
  { immediate: true },
);

function getActiveLabel(): string {
  for (const cat of navCategories) {
    const sub = cat.children.find((c) => c.id === activeReport.value);
    if (sub) return `${cat.label} — ${sub.label}`;
  }
  return '';
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (currenciesStore.currencies.length === 0) currenciesStore.fetchCurrencies();
  if (customerStore.customerList.length === 0) customerStore.fetchCustomers();
  if (productStore.productList.length === 0) await productStore.fetchProducts();
  if (warehouseStore.warehouseList.length === 0) await warehouseStore.fetchWarehouses();
  stockStore.fetchStock();
  salesReportStore.fetchEntries();
  accountsReceivableStore.fetchEntries();
  vendedorStore.fetchVendedores();
  await fetchKardex();
});

// ─── Utilities ─────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
}

function handlePrint(): void {
  window.print();
}

function getBadgeStyle(tipo: string): string {
  switch (tipo) {
    case 'CARGO_TRANSFORMACION': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'DESCARGO_TRANSFORMACION': return 'bg-indigo-100 text-indigo-900 border-indigo-300';
    case 'VENTA': return 'bg-purple-100 text-purple-900 border-purple-300';
    case 'COMPRA': return 'bg-teal-100 text-teal-900 border-teal-300';
    case 'AJUSTE': return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'CARGO': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'DESCARGO': return 'bg-red-50 text-red-800 border-red-200';
    case 'TRANSFERENCIA': return 'bg-blue-50 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

// ─── Kárdex ────────────────────────────────────────────────────────────────────
const kardexWarehouseId = ref<string>('ALL');
const kardexProductId = ref<string>('');
const kardexTipoClasificado = ref<string>('TODOS');
const kardexFechaDesde = ref<string>('');
const kardexFechaHasta = ref<string>('');
const kardexSearchTerm = ref<string>('');
const kardexRows = ref<KardexRow[]>([]);
const isLoadingKardex = ref<boolean>(false);

const clasificacionesOptions = [
  { value: 'TODOS', label: 'Todas las Clasificaciones' },
  { value: 'AJUSTE', label: 'Ajuste de Existencia' },
  { value: 'CARGO', label: 'Cargo (Entrada Directa)' },
  { value: 'DESCARGO', label: 'Descargo (Salida Directa)' },
  { value: 'CARGO_TRANSFORMACION', label: 'Cargo (Transformación)' },
  { value: 'DESCARGO_TRANSFORMACION', label: 'Descargo (Transformación)' },
  { value: 'VENTA', label: 'Venta / Facturación' },
  { value: 'COMPRA', label: 'Compra a Proveedor' },
  { value: 'TRANSFERENCIA', label: 'Transferencia entre Almacenes' },
];

function getProductStock(productId: string): number {
  if (!productId) return 0;
  if (kardexWarehouseId.value && kardexWarehouseId.value !== 'ALL') {
    return stockStore.getStockItem(productId, kardexWarehouseId.value)?.quantity ?? 0;
  }
  return stockStore.stockList
    .filter((s) => String(s.productId) === String(productId))
    .reduce((sum, s) => sum + s.quantity, 0);
}

async function fetchKardex(): Promise<void> {
  isLoadingKardex.value = true;
  try {
    const params: Record<string, string | number> = {};
    if (kardexProductId.value) params.productoId = Number(kardexProductId.value);
    if (kardexWarehouseId.value && kardexWarehouseId.value !== 'ALL') {
      params.almacenId = Number(kardexWarehouseId.value);
    }
    if (kardexFechaDesde.value) params.fechaDesde = kardexFechaDesde.value;
    if (kardexFechaHasta.value) params.fechaHasta = kardexFechaHasta.value;
    if (kardexTipoClasificado.value && kardexTipoClasificado.value !== 'TODOS') {
      params.tipoClasificado = kardexTipoClasificado.value;
    }
    const { data } = await apiClient.get<KardexRow[]>('/stock/kardex', { params });
    kardexRows.value = data;
  } catch {
    kardexRows.value = [];
  } finally {
    isLoadingKardex.value = false;
  }
}

function clearKardexFilters(): void {
  kardexProductId.value = '';
  kardexWarehouseId.value = 'ALL';
  kardexTipoClasificado.value = 'TODOS';
  kardexFechaDesde.value = '';
  kardexFechaHasta.value = '';
  kardexSearchTerm.value = '';
  fetchKardex();
}

const filteredKardex = computed<KardexRow[]>(() => {
  const term = kardexSearchTerm.value.trim().toLowerCase();
  if (!term) return kardexRows.value;
  return kardexRows.value.filter(
    (r) =>
      r.numeroDocumento.toLowerCase().includes(term) ||
      r.productoCodigo.toLowerCase().includes(term) ||
      r.productoNombre.toLowerCase().includes(term) ||
      (r.motivo || '').toLowerCase().includes(term),
  );
});

const totalEntradasKardex = computed(() => filteredKardex.value.reduce((s, r) => s + r.cantidadEntrada, 0));
const totalSalidasKardex = computed(() => filteredKardex.value.reduce((s, r) => s + r.cantidadSalida, 0));
const totalPesoKardex = computed(() => filteredKardex.value.reduce((s, r) => s + r.pesoTotalKg, 0));

function exportKardexExcel(): void {
  const headers = ['Fecha/Hora', 'Documento #', 'Doc. Origen', 'Almacén', 'Cód. Producto', 'Descripción', 'Clasificación', 'Entrada (+)', 'Salida (-)', 'Peso (kg)', 'Motivo', 'Usuario'];
  const rows = filteredKardex.value.map((r) => [
    formatDate(r.fechaOperacion), r.numeroDocumento, r.documentoOrigen || '',
    r.depositoOrigenNombre || r.depositoDestinoNombre || '', r.productoCodigo, r.productoNombre,
    r.tipoClasificadoNombre, r.cantidadEntrada > 0 ? r.cantidadEntrada : 0,
    r.cantidadSalida > 0 ? r.cantidadSalida : 0, r.pesoTotalKg.toFixed(2),
    r.motivo || r.observaciones || '', r.usuarioNombre || 'Sistema',
  ]);
  exportToCsv(`Kardex_Movimiento_Unidades_${new Date().toISOString().slice(0, 10)}`, headers, rows);
}

// ─── Inventario General ────────────────────────────────────────────────────────
const inventoryWarehouseFilter = ref<string>('ALL');
const inventorySearchTerm = ref<string>('');

interface InventoryRow {
  productId: string;
  sku: string;
  name: string;
  warehouseName: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
}

const inventoryRows = computed<InventoryRow[]>(() => {
  const term = inventorySearchTerm.value.trim().toLowerCase();
  return stockStore.stockList
    .filter((item) => inventoryWarehouseFilter.value === 'ALL' || item.warehouseId === inventoryWarehouseFilter.value)
    .map((item) => {
      const product = productStore.getProductById(item.productId);
      const unitCost = product?.precioCosto ?? 0;
      return {
        productId: item.productId,
        sku: product?.codigo ?? '',
        name: product?.nombre ?? item.productId,
        warehouseName: warehouseStore.getWarehouseById(item.warehouseId)?.name ?? '—',
        quantity: item.quantity,
        unitCost,
        totalValue: unitCost * item.quantity,
      };
    })
    .filter((row) => term === '' || row.name.toLowerCase().includes(term) || row.sku.toLowerCase().includes(term));
});

const inventoryTotalValue = computed(() => inventoryRows.value.reduce((s, r) => s + r.totalValue, 0));

function exportInventoryExcel(): void {
  const headers = ['Código', 'Producto', 'Almacén', 'Existencia', 'Costo Unit ($)', 'Valor Total ($)'];
  const rows = inventoryRows.value.map((r) => [r.sku, r.name, r.warehouseName, r.quantity, r.unitCost.toFixed(2), r.totalValue.toFixed(2)]);
  exportToCsv(`Reporte_General_Inventario_${new Date().toISOString().slice(0, 10)}`, headers, rows);
}

// ─── Ventas ────────────────────────────────────────────────────────────────────
const salesDateFrom = ref<string>('');
const salesDateTo = ref<string>('');
const salesCustomerTerm = ref<string>('');
const salesStatus = ref<string>('ALL');
const salesTiendaFilter = ref<string>('ALL');
const selectedVendedoresFilter = ref<number[]>([]);

function customerName(clienteId: string): string {
  const c = customerStore.getCustomerById(clienteId);
  return c ? `${c.firstName} ${c.lastName}`.trim() : clienteId;
}

function toggleVendedorFilter(vendedorId: number) {
  const idx = selectedVendedoresFilter.value.indexOf(vendedorId);
  if (idx >= 0) {
    selectedVendedoresFilter.value.splice(idx, 1);
  } else {
    selectedVendedoresFilter.value.push(vendedorId);
  }
}

function isVendedorSelected(vendedorId: number): boolean {
  return selectedVendedoresFilter.value.includes(vendedorId);
}

function clearVendedorFilter(): void {
  selectedVendedoresFilter.value = [];
}

const filteredSales = computed(() =>
  salesReportStore.entries.filter((e) => {
    const from = salesDateFrom.value === '' || e.fechaEmision.slice(0, 10) >= salesDateFrom.value;
    const to = salesDateTo.value === '' || e.fechaEmision.slice(0, 10) <= salesDateTo.value;
    const status = salesStatus.value === 'ALL' || e.estado === salesStatus.value;
    const term = salesCustomerTerm.value.trim().toLowerCase();
    const cust = term === '' || customerName(e.clienteId).toLowerCase().includes(term);

    // Filtro por tienda/sigla
    const sigla = extraerSiglaCorrelativo(e.numeroFactura);
    const matchTienda = salesTiendaFilter.value === 'ALL' || sigla === salesTiendaFilter.value;

    // Filtro multi-vendedor (WHERE vendedor_id IN (...) OR vendedor_secundario_id IN (...))
    const matchVendedor =
      selectedVendedoresFilter.value.length === 0 ||
      (e.vendedorId !== null &&
        e.vendedorId !== undefined &&
        selectedVendedoresFilter.value.includes(Number(e.vendedorId))) ||
      (e.vendedorSecundarioId !== null &&
        e.vendedorSecundarioId !== undefined &&
        selectedVendedoresFilter.value.includes(Number(e.vendedorSecundarioId)));

    return from && to && status && cust && matchTienda && matchVendedor;
  }),
);

const salesTotals = computed(() =>
  filteredSales.value.reduce(
    (acc, e) => ({
      subtotal: acc.subtotal + e.subtotal,
      montoIva: acc.montoIva + e.montoIva,
      igtf: acc.igtf + e.igtf,
      total: acc.total + e.total,
    }),
    { subtotal: 0, montoIva: 0, igtf: 0, total: 0 },
  ),
);

// Resumen agrupado por vendedor (con % atribuido para ventas compartidas)
const salesByVendedorSummary = computed(() => {
  const map = new Map<
    string,
    { id: number | null; nombre: string; codigo: string; totalVentas: number; cantidad: number; compartidas: number }
  >();

  for (const s of filteredSales.value) {
    // Vendedor 1
    const v1Id = s.vendedorId ?? null;
    const v1 = v1Id ? vendedorStore.getVendedorById(String(v1Id)) : null;
    const v1Nombre = s.vendedorNombre || v1?.nombre || s.usuarioNombre || 'Sin Vendedor';
    const v1Codigo = v1?.codigo || 'S/C';
    const pct1 = s.porcentajeVendedor1 !== undefined ? s.porcentajeVendedor1 : 100;
    const monto1 = s.total * (pct1 / 100);

    const key1 = `${v1Id ?? 'none'}_${v1Nombre}`;
    if (!map.has(key1)) {
      map.set(key1, { id: v1Id, nombre: v1Nombre, codigo: v1Codigo, totalVentas: 0, cantidad: 0, compartidas: 0 });
    }
    const item1 = map.get(key1)!;
    item1.totalVentas += monto1;
    item1.cantidad += 1;
    if (s.vendedorSecundarioId) item1.compartidas += 1;

    // Vendedor 2 si existe
    if (s.vendedorSecundarioId) {
      const v2Id = s.vendedorSecundarioId;
      const v2 = vendedorStore.getVendedorById(String(v2Id));
      const v2Nombre = s.vendedorSecundarioNombre || v2?.nombre || 'Vendedor Tienda';
      const v2Codigo = v2?.codigo || 'S/C';
      const pct2 = s.porcentajeVendedor2 !== undefined ? s.porcentajeVendedor2 : 50;
      const monto2 = s.total * (pct2 / 100);

      const key2 = `${v2Id}_${v2Nombre}`;
      if (!map.has(key2)) {
        map.set(key2, { id: v2Id, nombre: v2Nombre, codigo: v2Codigo, totalVentas: 0, cantidad: 0, compartidas: 0 });
      }
      const item2 = map.get(key2)!;
      item2.totalVentas += monto2;
      item2.cantidad += 1;
      item2.compartidas += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalVentas - a.totalVentas);
});

function exportSalesExcel(): void {
  const headers = [
    'Factura #',
    'Tienda',
    'Cliente',
    'Fecha',
    'Vendedor Principal',
    '% Vend 1',
    'Vendedor 2',
    '% Vend 2',
    'Subtotal',
    'IVA',
    'Total',
    'Estado',
  ];
  const rows = filteredSales.value.map((s) => [
    s.numeroFactura,
    extraerSiglaCorrelativo(s.numeroFactura),
    customerName(s.clienteId),
    s.fechaEmision.slice(0, 10),
    s.vendedorNombre || s.usuarioNombre || '—',
    s.porcentajeVendedor1 !== undefined ? `${s.porcentajeVendedor1}%` : '100%',
    s.vendedorSecundarioNombre || '—',
    s.porcentajeVendedor2 !== undefined ? `${s.porcentajeVendedor2}%` : '0%',
    s.subtotal.toFixed(2),
    s.montoIva.toFixed(2),
    s.total.toFixed(2),
    s.estado,
  ]);
  exportToCsv(`Resumen_Ventas_${new Date().toISOString().slice(0, 10)}`, headers, rows);
}

// ─── Cuentas por Cobrar ────────────────────────────────────────────────────────
const receivablesDateFrom = ref<string>('');
const receivablesDateTo = ref<string>('');
const receivablesCustomerTerm = ref<string>('');

const filteredReceivables = computed(() =>
  accountsReceivableStore.entries.filter((e) => {
    const from = receivablesDateFrom.value === '' || e.fechaVencimiento.slice(0, 10) >= receivablesDateFrom.value;
    const to = receivablesDateTo.value === '' || e.fechaVencimiento.slice(0, 10) <= receivablesDateTo.value;
    const term = receivablesCustomerTerm.value.trim().toLowerCase();
    const cust = term === '' || customerName(e.clienteId).toLowerCase().includes(term);
    return from && to && cust;
  }),
);

function exportReceivablesExcel(): void {
  const headers = ['Documento #', 'Cliente', 'Vencimiento', 'Monto Original ($)', 'Saldo Pendiente ($)', 'Estado'];
  const rows = filteredReceivables.value.map((r) => [
    r.numeroDocumento, customerName(r.clienteId), r.fechaVencimiento.slice(0, 10),
    r.montoOriginal.toFixed(2), r.saldoPendiente.toFixed(2), r.status,
  ]);
  exportToCsv(`Cuentas_por_Cobrar_${new Date().toISOString().slice(0, 10)}`, headers, rows);
}

// ─── DEFINICIÓN Y RECONOCIMIENTO DE TIENDAS POR CORRELATIVO ────────────────────
export interface StoreDefinition {
  sigla: string;
  nombre: string;
  icono: string;
  colorClass: string;
  bgLightClass: string;
  borderClass: string;
  barColor: string;
}

const TIENDAS_DEFINIDAS: StoreDefinition[] = [
  { sigla: 'SC', nombre: 'San Cristóbal', icono: '🏔️', colorClass: 'text-blue-700', bgLightClass: 'bg-blue-50', borderClass: 'border-blue-200', barColor: 'bg-blue-500' },
  { sigla: 'CCS', nombre: 'Caracas', icono: '🏙️', colorClass: 'text-indigo-700', bgLightClass: 'bg-indigo-50', borderClass: 'border-indigo-200', barColor: 'bg-indigo-500' },
  { sigla: 'CCD', nombre: 'La Concordia', icono: '🏪', colorClass: 'text-teal-700', bgLightClass: 'bg-teal-50', borderClass: 'border-teal-200', barColor: 'bg-teal-500' },
  { sigla: 'VLC', nombre: 'Valencia', icono: '🏭', colorClass: 'text-amber-700', bgLightClass: 'bg-amber-50', borderClass: 'border-amber-200', barColor: 'bg-amber-500' },
  { sigla: 'BNS', nombre: 'Barinas', icono: '🌾', colorClass: 'text-emerald-700', bgLightClass: 'bg-emerald-50', borderClass: 'border-emerald-200', barColor: 'bg-emerald-500' },
  { sigla: 'MCBO', nombre: 'Maracaibo', icono: '☀️', colorClass: 'text-orange-700', bgLightClass: 'bg-orange-50', borderClass: 'border-orange-200', barColor: 'bg-orange-500' },
  { sigla: 'MRD', nombre: 'Mérida', icono: '🚠', colorClass: 'text-cyan-700', bgLightClass: 'bg-cyan-50', borderClass: 'border-cyan-200', barColor: 'bg-cyan-500' },
  { sigla: 'NAC', nombre: 'Ventas Nacionales', icono: '🇻🇪', colorClass: 'text-purple-700', bgLightClass: 'bg-purple-50', borderClass: 'border-purple-200', barColor: 'bg-purple-600' },
];

function extraerSiglaCorrelativo(numeroFactura: string): string {
  const upper = (numeroFactura || '').toUpperCase();
  if (upper.includes('-NAC-') || upper.startsWith('NAC-') || upper.includes('NACIONAL')) return 'NAC';
  if (upper.includes('-CCS-') || upper.startsWith('CCS-') || upper.includes('CARACAS')) return 'CCS';
  if (upper.includes('-SC-') || upper.startsWith('SC-') || upper.includes('SAN CRISTOBAL') || upper.includes('SAN CRISTÓBAL')) return 'SC';
  if (upper.includes('-CCD-') || upper.startsWith('CCD-') || upper.includes('CONCORDIA')) return 'CCD';
  if (upper.includes('-VLC-') || upper.startsWith('VLC-') || upper.includes('VALENCIA')) return 'VLC';
  if (upper.includes('-BNS-') || upper.startsWith('BNS-') || upper.includes('BARINAS')) return 'BNS';
  if (upper.includes('-MCBO-') || upper.startsWith('MCBO-') || upper.includes('MARACAIBO')) return 'MCBO';
  if (upper.includes('-MRD-') || upper.startsWith('MRD-') || upper.includes('MERIDA') || upper.includes('MÉRIDA')) return 'MRD';
  return 'OTRAS';
}

// ─── Ventas por Tienda (Diario) ────────────────────────────────────────────────
const storeSalesDate = ref<string>(new Date().toISOString().slice(0, 10));
const storeSalesTiendaFilter = ref<string>('ALL');

function cambiarDiaStoreSales(delta: number) {
  const parts = storeSalesDate.value.split('-');
  const year = Number(parts[0]) || 2026;
  const month = Number(parts[1]) || 1;
  const day = Number(parts[2]) || 1;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  storeSalesDate.value = date.toISOString().slice(0, 10);
}

const storeSalesEntries = computed(() => {
  return salesReportStore.entries.filter(
    (e) => e.fechaEmision.slice(0, 10) === storeSalesDate.value && !(e.estado || '').toUpperCase().includes('ANULA'),
  );
});

const storeSalesSummary = computed(() => {
  const totalGeneral = storeSalesEntries.value.reduce((sum, e) => sum + e.total, 0) || 1;
  return TIENDAS_DEFINIDAS.map((t) => {
    const docs = storeSalesEntries.value.filter((e) => extraerSiglaCorrelativo(e.numeroFactura) === t.sigla);
    const total = docs.reduce((sum, e) => sum + e.total, 0);
    const cantidad = docs.length;
    const porcentaje = totalGeneral > 0 ? (total / totalGeneral) * 100 : 0;
    return { ...t, total, cantidad, porcentaje };
  });
});

const filteredStoreSalesDetails = computed(() => {
  if (storeSalesTiendaFilter.value === 'ALL') return storeSalesEntries.value;
  return storeSalesEntries.value.filter((e) => extraerSiglaCorrelativo(e.numeroFactura) === storeSalesTiendaFilter.value);
});

function exportStoreSalesExcel(): void {
  const headers = ['Tienda / Sigla', 'Factura #', 'Cliente', 'Hora/Fecha', 'Monto Total ($)', 'Estado'];
  const rows = filteredStoreSalesDetails.value.map((s) => [
    extraerSiglaCorrelativo(s.numeroFactura),
    s.numeroFactura,
    customerName(s.clienteId),
    s.fechaEmision,
    s.total.toFixed(2),
    s.estado,
  ]);
  exportToCsv(`Ventas_Por_Tienda_${storeSalesDate.value}`, headers, rows);
}

// ─── CxC por Tienda ────────────────────────────────────────────────────────────
const storeReceivablesTiendaFilter = ref<string>('ALL');

const storeReceivablesSummary = computed(() => {
  const pending = accountsReceivableStore.entries.filter((e) => e.status === 'PENDIENTE' && e.saldoPendiente > 0);
  const totalGeneral = pending.reduce((sum, e) => sum + e.saldoPendiente, 0) || 1;
  return TIENDAS_DEFINIDAS.map((t) => {
    const docs = pending.filter((e) => extraerSiglaCorrelativo(e.numeroDocumento) === t.sigla);
    const saldo = docs.reduce((sum, e) => sum + e.saldoPendiente, 0);
    const cantidad = docs.length;
    const porcentaje = totalGeneral > 0 ? (saldo / totalGeneral) * 100 : 0;
    return { ...t, saldo, cantidad, porcentaje };
  });
});

const filteredStoreReceivablesDetails = computed(() => {
  const pending = accountsReceivableStore.entries.filter((e) => e.status === 'PENDIENTE' && e.saldoPendiente > 0);
  if (storeReceivablesTiendaFilter.value === 'ALL') return pending;
  return pending.filter((e) => extraerSiglaCorrelativo(e.numeroDocumento) === storeReceivablesTiendaFilter.value);
});

function exportStoreReceivablesExcel(): void {
  const headers = ['Tienda / Sigla', 'Documento #', 'Cliente', 'Vencimiento', 'Monto Original ($)', 'Saldo Pendiente ($)', 'Estado'];
  const rows = filteredStoreReceivablesDetails.value.map((r) => [
    extraerSiglaCorrelativo(r.numeroDocumento),
    r.numeroDocumento,
    customerName(r.clienteId),
    r.fechaVencimiento.slice(0, 10),
    r.montoOriginal.toFixed(2),
    r.saldoPendiente.toFixed(2),
    r.status,
  ]);
  exportToCsv(`CxC_Por_Tienda_${new Date().toISOString().slice(0, 10)}`, headers, rows);
}

// ─── Stock Bajo por Tienda ─────────────────────────────────────────────────────
const storeLowStockTiendaFilter = ref<string>('ALL');

const storeLowStockRows = computed(() => {
  return stockStore.stockList
    .filter((item) => item.quantity < item.minQuantity)
    .map((item) => {
      const product = productStore.getProductById(item.productId);
      const warehouse = warehouseStore.getWarehouseById(item.warehouseId);
      const sucursal = warehouse ? sucursalStore.getSucursalById(String(warehouse.sucursalId)) : null;
      
      let sigla = 'OTRAS';
      const sucursalText = `${sucursal?.siglas || ''} ${sucursal?.codigo || ''} ${sucursal?.nombre || ''}`.toUpperCase();
      if (sucursalText.includes('NAC')) sigla = 'NAC';
      else if (sucursalText.includes('CCS') || sucursalText.includes('CARACAS')) sigla = 'CCS';
      else if (sucursalText.includes('SC') || sucursalText.includes('SAN CRISTOBAL')) sigla = 'SC';
      else if (sucursalText.includes('CCD') || sucursalText.includes('CONCORDIA')) sigla = 'CCD';
      else if (sucursalText.includes('VLC') || sucursalText.includes('VALENCIA')) sigla = 'VLC';
      else if (sucursalText.includes('BNS') || sucursalText.includes('BARINAS')) sigla = 'BNS';
      else if (sucursalText.includes('MCBO') || sucursalText.includes('MARACAIBO')) sigla = 'MCBO';
      else if (sucursalText.includes('MRD') || sucursalText.includes('MERIDA')) sigla = 'MRD';

      return {
        productId: item.productId,
        warehouseId: item.warehouseId,
        almacenNombre: warehouse?.name || `Almacén #${item.warehouseId}`,
        tiendaSigla: sigla,
        sku: product?.codigo ?? '',
        nombre: product?.nombre ?? item.productId,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
      };
    });
});

const filteredStoreLowStockRows = computed(() => {
  if (storeLowStockTiendaFilter.value === 'ALL') return storeLowStockRows.value;
  return storeLowStockRows.value.filter((r) => r.tiendaSigla === storeLowStockTiendaFilter.value);
});

function exportStoreLowStockExcel(): void {
  const headers = ['Tienda / Sigla', 'Almacén', 'Código SKU', 'Producto', 'Existencia Actual', 'Mínimo Requerido', 'Déficit'];
  const rows = filteredStoreLowStockRows.value.map((r) => [
    r.tiendaSigla,
    r.almacenNombre,
    r.sku,
    r.nombre,
    r.quantity,
    r.minQuantity,
    r.minQuantity - r.quantity,
  ]);
  exportToCsv(`Stock_Bajo_Por_Tienda_${new Date().toISOString().slice(0, 10)}`, headers, rows);
}

// ─── Export dispatcher ─────────────────────────────────────────────────────────
function handleExportExcel(): void {
  if (activeReport.value === 'inv_kardex') exportKardexExcel();
  else if (activeReport.value === 'inv_general' || activeReport.value === 'inv_fisico') exportInventoryExcel();
  else if (activeReport.value === 'inv_stock_bajo_tienda') exportStoreLowStockExcel();
  else if (activeReport.value === 'ven_resumen') exportSalesExcel();
  else if (activeReport.value === 'ven_por_tienda' || activeReport.value === 'res_ventas_tienda') exportStoreSalesExcel();
  else if (activeReport.value === 'cli_cuentas_cobrar' || activeReport.value === 'cli_cxc_tienda') exportStoreReceivablesExcel();
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-100 font-sans text-gray-800">
    <!-- ══ ÁREA PRINCIPAL DE CONTENIDO ═══════════════════════════════════════════ -->
    <main class="flex flex-1 flex-col overflow-hidden min-w-0">
      <!-- ── Toolbar superior ─────────────────────────────────────────────── -->
      <div class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2.5 print:hidden">
        <div class="flex items-center gap-2">
          <!-- Breadcrumb del informe activo -->
          <div class="min-w-0">
            <p class="text-[9px] font-bold uppercase tracking-widest text-gray-400">Informes</p>
            <h1 class="truncate text-base font-black leading-tight text-gray-900">{{ getActiveLabel() }}</h1>
          </div>
        </div>

        <!-- Selector Rápido de Informes -->
        <div class="hidden sm:flex items-center gap-2">
          <label class="text-xs font-bold text-gray-500">Informe:</label>
          <select
            v-model="activeReport"
            class="rounded-lg border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-800 outline-none focus:border-brand focus:bg-white"
          >
            <optgroup v-for="cat in navCategories" :key="cat.id" :label="cat.label">
              <option v-for="sub in cat.children" :key="sub.id" :value="sub.id">
                {{ sub.label }}
              </option>
            </optgroup>
          </select>
        </div>

        <!-- Botones de acción -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
            @click="handleExportExcel"
          >
            📊 Exportar Excel
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-hover"
            @click="handlePrint"
          >
            🖨️ Imprimir PDF
          </button>
        </div>
      </div>

      <!-- ── Área scrolleable del informe ──────────────────────────────────── -->
      <div class="flex-1 overflow-y-auto overflow-x-auto p-4">

        <!-- ════════════════════════════════════════════════════════════════════
             INFORME: VENTAS DIARIAS (CIERRE DE OPERACIONES / LEGACY)
             ════════════════════════════════════════════════════════════════ -->
        <section v-if="activeReport === 'ven_diario'">
          <DailySalesReport />
        </section>

          <!-- ════════════════════════════════════════════════════════════════════
               INFORME: MOVIMIENTO DE UNIDADES (KÁRDEX)
               ════════════════════════════════════════════════════════════════ -->
          <section v-else-if="activeReport === 'inv_kardex'">

            <!-- Filtros -->
            <div class="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
              <div class="grid grid-cols-12 gap-3">
                <div class="col-span-12 sm:col-span-5">
                  <label class="mb-1 block text-xs font-semibold text-gray-600">Producto:</label>
                  <ProductSearchSelect
                    v-model="kardexProductId"
                    :products="productStore.sortedProductsByCode"
                    :get-stock="getProductStock"
                    placeholder="Todos los productos..."
                    @select="fetchKardex"
                  />
                </div>
                <div class="col-span-6 sm:col-span-3">
                  <label class="mb-1 block text-xs font-semibold text-gray-600">Depósito / Almacén:</label>
                  <select
                    v-model="kardexWarehouseId"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand"
                    @change="fetchKardex"
                  >
                    <option value="ALL">Todos los Almacenes</option>
                    <option v-for="w in warehouseStore.sortedWarehouses" :key="w.id" :value="w.id">[{{ w.codigo }}] {{ w.name }}</option>
                  </select>
                </div>
                <div class="col-span-6 sm:col-span-4">
                  <label class="mb-1 block text-xs font-semibold text-gray-600">Tipo de Movimiento:</label>
                  <select
                    v-model="kardexTipoClasificado"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand"
                    @change="fetchKardex"
                  >
                    <option v-for="opt in clasificacionesOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-4 text-xs">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-500">Desde:</span>
                  <input v-model="kardexFechaDesde" type="date" class="rounded border border-gray-300 px-2 py-1 text-xs outline-none" @change="fetchKardex" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-500">Hasta:</span>
                  <input v-model="kardexFechaHasta" type="date" class="rounded border border-gray-300 px-2 py-1 text-xs outline-none" @change="fetchKardex" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-500">Buscar:</span>
                  <input v-model="kardexSearchTerm" type="text" placeholder="Doc, producto, motivo..." class="w-44 rounded border border-gray-300 px-2 py-1 text-xs outline-none" />
                </div>
                <button type="button" class="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200" @click="clearKardexFilters">Limpiar</button>
              </div>
            </div>

            <!-- Totales -->
            <div class="mb-4 grid gap-3 sm:grid-cols-4">
              <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                <p class="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Total Entradas (+)</p>
                <p class="mt-1 font-mono text-xl font-black text-emerald-800">+{{ totalEntradasKardex }}</p>
              </div>
              <div class="rounded-xl border border-red-200 bg-red-50 p-3 shadow-sm">
                <p class="text-[10px] font-bold uppercase tracking-wide text-red-700">Total Salidas (-)</p>
                <p class="mt-1 font-mono text-xl font-black text-red-800">-{{ totalSalidasKardex }}</p>
              </div>
              <div class="rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
                <p class="text-[10px] font-bold uppercase tracking-wide text-blue-700">Saldo Neto</p>
                <p class="mt-1 font-mono text-xl font-black text-blue-900">{{ totalEntradasKardex - totalSalidasKardex }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <p class="text-[10px] font-bold uppercase tracking-wide text-gray-500">Total Peso (kg)</p>
                <p class="mt-1 font-mono text-xl font-black text-gray-900">{{ totalPesoKardex.toFixed(2) }} kg</p>
              </div>
            </div>

            <!-- Tabla -->
            <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div v-if="isLoadingKardex" class="flex items-center justify-center py-16">
                <div class="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-brand"></div>
                <span class="ml-3 text-xs text-gray-400">Cargando movimientos...</span>
              </div>
              <div v-else class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="bg-gray-100 font-bold uppercase tracking-wide text-gray-600">
                      <th class="border-b px-3 py-3 whitespace-nowrap">Fecha / Hora</th>
                      <th class="border-b px-3 py-3 whitespace-nowrap">Documento #</th>
                      <th class="border-b px-3 py-3 whitespace-nowrap">Almacén</th>
                      <th class="border-b px-3 py-3">Producto</th>
                      <th class="border-b px-3 py-3 text-center whitespace-nowrap">Tipo / Origen</th>
                      <th class="border-b px-3 py-3 text-right whitespace-nowrap">Entrada (+)</th>
                      <th class="border-b px-3 py-3 text-right whitespace-nowrap">Salida (-)</th>
                      <th class="border-b px-3 py-3 text-right whitespace-nowrap">Peso (kg)</th>
                      <th class="border-b px-3 py-3">Motivo</th>
                      <th class="border-b px-3 py-3 whitespace-nowrap">Usuario</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <tr v-for="row in filteredKardex" :key="row.id" class="transition hover:bg-gray-50">
                      <td class="px-3 py-2.5 font-mono text-gray-500 whitespace-nowrap">{{ formatDate(row.fechaOperacion) }}</td>
                      <td class="px-3 py-2.5 font-mono font-bold text-gray-900 whitespace-nowrap">
                        #{{ row.numeroDocumento }}
                        <span v-if="row.documentoOrigen" class="block text-[10px] font-normal text-gray-400">{{ row.documentoOrigen }}</span>
                      </td>
                      <td class="px-3 py-2.5 text-gray-700 whitespace-nowrap">{{ row.depositoOrigenNombre || row.depositoDestinoNombre || '—' }}</td>
                      <td class="px-3 py-2.5 font-medium text-gray-900">
                        <span class="font-mono font-bold text-brand">[{{ row.productoCodigo }}]</span>
                        <span class="ml-1">{{ row.productoNombre }}</span>
                      </td>
                      <td class="px-3 py-2.5 text-center whitespace-nowrap">
                        <span class="inline-block rounded border px-2 py-0.5 text-[10px] font-bold" :class="getBadgeStyle(row.tipoClasificado)">
                          {{ row.tipoClasificadoNombre }}
                        </span>
                      </td>
                      <td class="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        <span v-if="row.cantidadEntrada > 0">+{{ row.cantidadEntrada }} {{ row.unidadMedida }}</span>
                        <span v-else class="text-gray-300">—</span>
                      </td>
                      <td class="px-3 py-2.5 text-right font-mono font-bold text-red-700 whitespace-nowrap">
                        <span v-if="row.cantidadSalida > 0">-{{ row.cantidadSalida }} {{ row.unidadMedida }}</span>
                        <span v-else class="text-gray-300">—</span>
                      </td>
                      <td class="px-3 py-2.5 text-right font-mono text-blue-800 whitespace-nowrap">{{ row.pesoTotalKg.toFixed(2) }} kg</td>
                      <td class="max-w-xs truncate px-3 py-2.5 text-gray-600" :title="row.motivo || row.observaciones || ''">{{ row.motivo || row.observaciones || '—' }}</td>
                      <td class="px-3 py-2.5 text-gray-500 whitespace-nowrap">{{ row.usuarioNombre || 'Sistema' }}</td>
                    </tr>
                    <tr v-if="filteredKardex.length === 0">
                      <td colspan="10" class="px-4 py-12 text-center text-gray-400">No se encontraron registros de movimientos para los filtros seleccionados.</td>
                    </tr>
                  </tbody>
                  <tfoot v-if="filteredKardex.length > 0">
                    <tr class="border-t-2 border-gray-300 bg-gray-100 font-bold text-gray-800">
                      <td colspan="5" class="px-3 py-3 text-right text-xs uppercase">Totales:</td>
                      <td class="px-3 py-3 text-right font-mono text-emerald-800">+{{ totalEntradasKardex }}</td>
                      <td class="px-3 py-3 text-right font-mono text-red-800">-{{ totalSalidasKardex }}</td>
                      <td class="px-3 py-3 text-right font-mono text-blue-800">{{ totalPesoKardex.toFixed(2) }} kg</td>
                      <td colspan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>

          <!-- ════════════════════════════════════════════════════════════════════
               INFORME: REPORTE GENERAL / INVENTARIO FÍSICO
               ════════════════════════════════════════════════════════════════ -->
          <section v-else-if="activeReport === 'inv_general' || activeReport === 'inv_fisico'">
            <div class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
              <div>
                <label class="mb-1 block text-xs font-semibold text-gray-600">Depósito / Almacén:</label>
                <select v-model="inventoryWarehouseFilter" class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand">
                  <option value="ALL">Todos los Almacenes</option>
                  <option v-for="w in warehouseStore.sortedWarehouses" :key="w.id" :value="w.id">[{{ w.codigo }}] {{ w.name }}</option>
                </select>
              </div>
              <div class="flex-1 min-w-[200px]">
                <label class="mb-1 block text-xs font-semibold text-gray-600">Buscar Producto:</label>
                <input v-model="inventorySearchTerm" type="text" placeholder="Código SKU o nombre..." class="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-brand" />
              </div>
            </div>

            <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-gray-100 font-bold uppercase text-gray-600">
                    <th class="px-4 py-3">Código</th>
                    <th class="px-4 py-3">Nombre del Producto</th>
                    <th class="px-4 py-3">Almacén</th>
                    <th class="px-4 py-3 text-right">Existencia Física</th>
                    <th class="px-4 py-3 text-right">Costo Unit. ($)</th>
                    <th class="px-4 py-3 text-right">Valor Total ($)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="row in inventoryRows" :key="row.productId + row.warehouseName" class="hover:bg-gray-50">
                    <td class="px-4 py-2.5 font-mono font-bold text-gray-900">{{ row.sku }}</td>
                    <td class="px-4 py-2.5 font-medium text-gray-900">{{ row.name }}</td>
                    <td class="px-4 py-2.5 text-gray-600">{{ row.warehouseName }}</td>
                    <td class="px-4 py-2.5 text-right font-mono font-bold" :class="row.quantity > 0 ? 'text-emerald-700' : 'text-red-600'">{{ row.quantity }}</td>
                    <td class="px-4 py-2.5 text-right font-mono text-gray-700">${{ row.unitCost.toFixed(2) }}</td>
                    <td class="px-4 py-2.5 text-right font-mono font-bold text-gray-900">${{ row.totalValue.toFixed(2) }}</td>
                  </tr>
                  <tr v-if="inventoryRows.length === 0">
                    <td colspan="6" class="px-4 py-10 text-center text-gray-400">No se encontraron productos en inventario.</td>
                  </tr>
                </tbody>
                <tfoot v-if="inventoryRows.length > 0">
                  <tr class="border-t-2 border-gray-300 bg-gray-100 font-bold text-gray-800">
                    <td colspan="5" class="px-4 py-3 text-right text-xs uppercase">Valor Total del Inventario:</td>
                    <td class="px-4 py-3 text-right font-mono text-emerald-800">${{ inventoryTotalValue.toFixed(2) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <!-- ════════════════════════════════════════════════════════════════════
               INFORME: VENTAS
               ════════════════════════════════════════════════════════════════ -->
          <section v-else-if="activeReport === 'ven_resumen' || activeReport === 'ven_por_vendedor'">
            <!-- Filtros Superiores -->
            <div class="mb-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
              <div class="flex flex-wrap items-end gap-3">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-600">Desde:</label>
                  <input v-model="salesDateFrom" type="date" class="rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-brand" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-600">Hasta:</label>
                  <input v-model="salesDateTo" type="date" class="rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-brand" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-600">Tienda / Origen:</label>
                  <select v-model="salesTiendaFilter" class="rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-brand">
                    <option value="ALL">🌐 Todas las Tiendas y Nacional</option>
                    <option v-for="t in TIENDAS_DEFINIDAS" :key="t.sigla" :value="t.sigla">
                      {{ t.icono }} {{ t.nombre }} ({{ t.sigla }})
                    </option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-600">Estado:</label>
                  <select v-model="salesStatus" class="rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-brand">
                    <option value="ALL">Todos los Estados</option>
                    <option value="EMITIDA">EMITIDA</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="ANULADA">ANULADA</option>
                  </select>
                </div>
                <div class="flex-1 min-w-[180px]">
                  <label class="mb-1 block text-xs font-semibold text-gray-600">Buscar Cliente:</label>
                  <input v-model="salesCustomerTerm" type="text" placeholder="Nombre de cliente..." class="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-brand" />
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    @click="exportSalesExcel"
                  >
                    📥 Exportar Excel
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-brand bg-brand/10 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/20"
                    @click="salesReportStore.fetchEntries()"
                  >
                    🔄 Recargar
                  </button>
                </div>
              </div>

              <!-- Filtro Multi-Vendedor (IN (...)) -->
              <div class="border-t border-gray-100 pt-3">
                <div class="mb-1.5 flex items-center justify-between">
                  <span class="text-xs font-bold text-gray-700">
                    Filtrar por Vendedor(es) <span class="text-gray-400 text-[10px] font-normal">(Selección múltiple):</span>
                  </span>
                  <button
                    v-if="selectedVendedoresFilter.length > 0"
                    type="button"
                    class="text-[11px] font-semibold text-brand hover:underline"
                    @click="clearVendedorFilter"
                  >
                    Limpiar selección (Ver todos)
                  </button>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    :class="[
                      'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                      selectedVendedoresFilter.length === 0
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                    ]"
                    @click="clearVendedorFilter"
                  >
                    ✓ Todos
                  </button>
                  <button
                    v-for="v in vendedorStore.sortedVendedores"
                    :key="v.id"
                    type="button"
                    :class="[
                      'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                      isVendedorSelected(Number(v.id))
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-900 ring-1 ring-indigo-500'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    ]"
                    @click="toggleVendedorFilter(Number(v.id))"
                  >
                    <span v-if="isVendedorSelected(Number(v.id))" class="text-indigo-600 font-black">✓</span>
                    <span>{{ v.codigo }} - {{ v.nombre }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Resumen por Vendedor (Específico para 'Ventas por Vendedor') -->
            <div v-if="activeReport === 'ven_por_vendedor'" class="mb-4">
              <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Resumen de Rendimiento y Comisiones por Vendedor
              </h3>
              <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div
                  v-for="sum in salesByVendedorSummary"
                  :key="sum.id ?? sum.nombre"
                  class="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 shadow-sm"
                >
                  <div class="flex items-center justify-between">
                    <span class="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                      {{ sum.codigo }}
                    </span>
                    <span v-if="sum.compartidas > 0" class="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                      {{ sum.compartidas }} compartida(s)
                    </span>
                  </div>
                  <h4 class="mt-1 font-bold text-gray-900 text-sm truncate" :title="sum.nombre">{{ sum.nombre }}</h4>
                  <div class="mt-2 flex items-baseline justify-between">
                    <span class="text-xs text-gray-500">{{ sum.cantidad }} factura(s)</span>
                    <span class="font-mono text-base font-black text-indigo-900">${{ sum.totalVentas.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- KPIs Globales -->
            <div class="mb-4 grid gap-3 sm:grid-cols-4">
              <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                <p class="text-[10px] font-bold uppercase text-emerald-700">Total Facturas</p>
                <p class="mt-1 text-xl font-black text-emerald-900">{{ filteredSales.length }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <p class="text-[10px] font-bold uppercase text-gray-500">Subtotal</p>
                <p class="mt-1 font-mono text-xl font-black text-gray-900">${{ salesTotals.subtotal.toFixed(2) }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <p class="text-[10px] font-bold uppercase text-gray-500">IVA</p>
                <p class="mt-1 font-mono text-xl font-black text-gray-900">${{ salesTotals.montoIva.toFixed(2) }}</p>
              </div>
              <div class="rounded-xl border border-brand/30 bg-brand/5 p-3 shadow-sm">
                <p class="text-[10px] font-bold uppercase text-brand">Total</p>
                <p class="mt-1 font-mono text-xl font-black text-brand">${{ salesTotals.total.toFixed(2) }}</p>
              </div>
            </div>

            <!-- Tabla Detallada de Ventas -->
            <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-gray-100 font-bold uppercase text-gray-600">
                    <th class="px-3 py-3">Tienda</th>
                    <th class="px-3 py-3">Factura #</th>
                    <th class="px-3 py-3">Cliente</th>
                    <th class="px-3 py-3">Fecha</th>
                    <th class="px-3 py-3">Vendedor(es) & Participación</th>
                    <th class="px-3 py-3 text-right">Subtotal</th>
                    <th class="px-3 py-3 text-right">IVA</th>
                    <th class="px-3 py-3 text-right">Total</th>
                    <th class="px-3 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="e in filteredSales" :key="e.id" class="hover:bg-gray-50">
                    <td class="px-3 py-2.5">
                      <span class="rounded px-1.5 py-0.5 text-[10px] font-black" :class="extraerSiglaCorrelativo(e.numeroFactura) === 'NAC' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'">
                        {{ extraerSiglaCorrelativo(e.numeroFactura) }}
                      </span>
                    </td>
                    <td class="px-3 py-2.5 font-mono font-bold text-gray-900">#{{ e.numeroFactura }}</td>
                    <td class="px-3 py-2.5 font-medium text-gray-900">{{ customerName(e.clienteId) }}</td>
                    <td class="px-3 py-2.5 font-mono text-gray-600">{{ e.fechaEmision.slice(0, 10) }}</td>
                    <td class="px-3 py-2.5">
                      <div v-if="e.vendedorSecundarioNombre" class="space-y-0.5">
                        <div class="flex items-center gap-1">
                          <span class="rounded bg-indigo-100 px-1 py-0.2 text-[9px] font-bold text-indigo-800">
                            {{ e.porcentajeVendedor1 ?? 50 }}%
                          </span>
                          <span class="font-medium text-gray-900 truncate max-w-[130px]">{{ e.vendedorNombre || 'Redes' }}</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800">
                            {{ e.porcentajeVendedor2 ?? 50 }}%
                          </span>
                          <span class="font-medium text-gray-700 truncate max-w-[130px]">{{ e.vendedorSecundarioNombre }}</span>
                        </div>
                      </div>
                      <div v-else-if="e.vendedorNombre" class="flex items-center gap-1">
                        <span class="rounded bg-gray-100 px-1 py-0.2 text-[9px] font-bold text-gray-700">100%</span>
                        <span class="font-medium text-gray-900">{{ e.vendedorNombre }}</span>
                      </div>
                      <div v-else class="text-gray-400 italic">
                        {{ e.usuarioNombre ? `Por: ${e.usuarioNombre}` : 'Sin asignar' }}
                      </div>
                    </td>
                    <td class="px-3 py-2.5 text-right font-mono text-gray-700">${{ e.subtotal.toFixed(2) }}</td>
                    <td class="px-3 py-2.5 text-right font-mono text-gray-700">${{ e.montoIva.toFixed(2) }}</td>
                    <td class="px-3 py-2.5 text-right font-mono font-bold text-emerald-800">${{ e.total.toFixed(2) }}</td>
                    <td class="px-3 py-2.5 font-semibold text-gray-600">{{ e.estado }}</td>
                  </tr>
                  <tr v-if="filteredSales.length === 0">
                    <td colspan="9" class="px-4 py-10 text-center text-gray-400">No se encontraron ventas para los filtros seleccionados.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- ════════════════════════════════════════════════════════════════════
               INFORME: CLIENTES - CUENTAS POR COBRAR / ESTADO DE CUENTA
               ════════════════════════════════════════════════════════════════ -->
          <section v-else-if="activeReport === 'cli_cuentas_cobrar' || activeReport === 'cli_estado_cuenta'">
            <div class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
              <div>
                <label class="mb-1 block text-xs font-semibold text-gray-600">Desde:</label>
                <input v-model="receivablesDateFrom" type="date" class="rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-gray-600">Hasta:</label>
                <input v-model="receivablesDateTo" type="date" class="rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none" />
              </div>
              <div class="flex-1 min-w-[200px]">
                <label class="mb-1 block text-xs font-semibold text-gray-600">Buscar Cliente:</label>
                <input v-model="receivablesCustomerTerm" type="text" placeholder="Nombre..." class="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none" />
              </div>
            </div>

            <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-gray-100 font-bold uppercase text-gray-600">
                    <th class="px-4 py-3">Documento #</th>
                    <th class="px-4 py-3">Tipo</th>
                    <th class="px-4 py-3">Cliente</th>
                    <th class="px-4 py-3">Vencimiento</th>
                    <th class="px-4 py-3 text-right">Monto Original ($)</th>
                    <th class="px-4 py-3 text-right">Saldo Pendiente ($)</th>
                    <th class="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="e in filteredReceivables" :key="e.id" class="hover:bg-gray-50">
                    <td class="px-4 py-2.5 font-mono font-bold text-gray-900">#{{ e.numeroDocumento }}</td>
                    <td class="px-4 py-2.5 text-gray-600">{{ e.tipoDocumento }}</td>
                    <td class="px-4 py-2.5 font-medium text-gray-900">{{ customerName(e.clienteId) }}</td>
                    <td class="px-4 py-2.5 font-mono text-gray-600">{{ e.fechaVencimiento.slice(0, 10) }}</td>
                    <td class="px-4 py-2.5 text-right font-mono text-gray-700">${{ e.montoOriginal.toFixed(2) }}</td>
                    <td class="px-4 py-2.5 text-right font-mono font-bold text-red-800">${{ e.saldoPendiente.toFixed(2) }}</td>
                    <td class="px-4 py-2.5">
                      <span class="rounded px-2 py-0.5 text-[10px] font-bold" :class="e.status === 'PAGADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'">
                        {{ e.status }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="filteredReceivables.length === 0">
                    <td colspan="7" class="px-4 py-10 text-center text-gray-400">No se encontraron registros de cuentas por cobrar.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- ════════════════════════════════════════════════════════════════════
               INFORME: VENTAS POR TIENDA (DIARIO / FECHAS)
               ════════════════════════════════════════════════════════════════ -->
          <section v-else-if="activeReport === 'ven_por_tienda' || activeReport === 'res_ventas_tienda'">
            <!-- Barra de Filtros -->
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  @click="cambiarDiaStoreSales(-1)"
                >
                  ◀ Anterior
                </button>
                <input
                  v-model="storeSalesDate"
                  type="date"
                  class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-800 outline-none"
                />
                <button
                  type="button"
                  class="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  @click="storeSalesDate = new Date().toISOString().slice(0, 10)"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  @click="cambiarDiaStoreSales(1)"
                >
                  Siguiente ▶
                </button>
              </div>

              <div class="flex items-center gap-2">
                <label class="text-xs font-bold text-gray-600">Filtrar Tienda:</label>
                <select
                  v-model="storeSalesTiendaFilter"
                  class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 outline-none focus:border-brand"
                >
                  <option value="ALL">🏢 Todas las Tiendas</option>
                  <option v-for="t in TIENDAS_DEFINIDAS" :key="t.sigla" :value="t.sigla">
                    {{ t.icono }} {{ t.nombre }} [{{ t.sigla }}]
                  </option>
                </select>
              </div>
            </div>

            <!-- Tarjetas de Resumen por Tienda -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 print:hidden">
              <div
                v-for="tienda in storeSalesSummary"
                :key="tienda.sigla"
                class="rounded-xl border p-3.5 shadow-xs cursor-pointer transition hover:shadow-sm"
                :class="[
                  tienda.bgLightClass,
                  storeSalesTiendaFilter === tienda.sigla ? 'ring-2 ring-brand border-brand' : tienda.borderClass,
                ]"
                @click="storeSalesTiendaFilter = storeSalesTiendaFilter === tienda.sigla ? 'ALL' : tienda.sigla"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-bold text-xs text-gray-900">{{ tienda.icono }} {{ tienda.nombre }}</span>
                  <span class="rounded px-1.5 py-0.2 font-mono text-[10px] font-black border bg-white" :class="tienda.colorClass">
                    {{ tienda.sigla }}
                  </span>
                </div>
                <p class="text-base font-black text-gray-900">${{ tienda.total.toFixed(2) }}</p>
                <div class="flex items-center justify-between text-[10px] font-semibold text-gray-500 mt-1">
                  <span>{{ tienda.cantidad }} facturas</span>
                  <span :class="tienda.colorClass">{{ tienda.porcentaje.toFixed(1) }}%</span>
                </div>
              </div>
            </div>

            <!-- Tabla de Detalle -->
            <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-gray-100 font-bold uppercase text-gray-600">
                    <th class="px-4 py-3">Tienda / Sigla</th>
                    <th class="px-4 py-3">Factura #</th>
                    <th class="px-4 py-3">Cliente</th>
                    <th class="px-4 py-3">Hora / Fecha</th>
                    <th class="px-4 py-3 text-right">Monto Total ($)</th>
                    <th class="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="s in filteredStoreSalesDetails" :key="s.id" class="hover:bg-gray-50">
                    <td class="px-4 py-2.5 font-bold">
                      <span
                        class="rounded-full px-2 py-0.5 font-mono text-[10px] font-black border"
                        :class="extraerSiglaCorrelativo(s.numeroFactura) === 'NAC' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'"
                      >
                        [{{ extraerSiglaCorrelativo(s.numeroFactura) }}]
                      </span>
                    </td>
                    <td class="px-4 py-2.5 font-mono font-bold text-gray-800">{{ s.numeroFactura }}</td>
                    <td class="px-4 py-2.5 font-medium text-gray-900">{{ customerName(s.clienteId) }}</td>
                    <td class="px-4 py-2.5 font-mono text-gray-500">{{ s.fechaEmision }}</td>
                    <td class="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">${{ s.total.toFixed(2) }}</td>
                    <td class="px-4 py-2.5 text-center">
                      <span class="rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {{ s.estado }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="filteredStoreSalesDetails.length === 0">
                    <td colspan="6" class="px-4 py-10 text-center text-gray-400">No se encontraron ventas para la fecha y tienda seleccionada.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- ════════════════════════════════════════════════════════════════════
               INFORME: CUENTAS POR COBRAR POR TIENDA
               ════════════════════════════════════════════════════════════════ -->
          <section v-else-if="activeReport === 'cli_cxc_tienda'">
            <!-- Barra de Filtros -->
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
              <span class="text-xs font-bold text-gray-700">Distribución de Deuda por Correlativo de Tienda</span>
              <div class="flex items-center gap-2">
                <label class="text-xs font-bold text-gray-600">Filtrar Tienda:</label>
                <select
                  v-model="storeReceivablesTiendaFilter"
                  class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 outline-none focus:border-brand"
                >
                  <option value="ALL">🏢 Todas las Tiendas</option>
                  <option v-for="t in TIENDAS_DEFINIDAS" :key="t.sigla" :value="t.sigla">
                    {{ t.icono }} {{ t.nombre }} [{{ t.sigla }}]
                  </option>
                </select>
              </div>
            </div>

            <!-- Tarjetas de Resumen por Tienda -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 print:hidden">
              <div
                v-for="tienda in storeReceivablesSummary"
                :key="tienda.sigla"
                class="rounded-xl border p-3.5 shadow-xs cursor-pointer transition hover:shadow-sm"
                :class="[
                  tienda.bgLightClass,
                  storeReceivablesTiendaFilter === tienda.sigla ? 'ring-2 ring-brand border-brand' : tienda.borderClass,
                ]"
                @click="storeReceivablesTiendaFilter = storeReceivablesTiendaFilter === tienda.sigla ? 'ALL' : tienda.sigla"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-bold text-xs text-gray-900">{{ tienda.icono }} {{ tienda.nombre }}</span>
                  <span class="rounded px-1.5 py-0.2 font-mono text-[10px] font-black border bg-white" :class="tienda.colorClass">
                    {{ tienda.sigla }}
                  </span>
                </div>
                <p class="text-base font-black text-gray-900">${{ tienda.saldo.toFixed(2) }}</p>
                <div class="flex items-center justify-between text-[10px] font-semibold text-gray-500 mt-1">
                  <span>{{ tienda.cantidad }} pendientes</span>
                  <span :class="tienda.colorClass">{{ tienda.porcentaje.toFixed(1) }}%</span>
                </div>
              </div>
            </div>

            <!-- Tabla de Detalle -->
            <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-gray-100 font-bold uppercase text-gray-600">
                    <th class="px-4 py-3">Tienda / Sigla</th>
                    <th class="px-4 py-3">Documento #</th>
                    <th class="px-4 py-3">Cliente</th>
                    <th class="px-4 py-3">Vencimiento</th>
                    <th class="px-4 py-3 text-right">Monto Original ($)</th>
                    <th class="px-4 py-3 text-right">Saldo Pendiente ($)</th>
                    <th class="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="r in filteredStoreReceivablesDetails" :key="r.id" class="hover:bg-gray-50">
                    <td class="px-4 py-2.5 font-bold">
                      <span class="rounded-full px-2 py-0.5 font-mono text-[10px] font-black border bg-blue-50 text-blue-700 border-blue-200">
                        [{{ extraerSiglaCorrelativo(r.numeroDocumento) }}]
                      </span>
                    </td>
                    <td class="px-4 py-2.5 font-mono font-bold text-gray-800">{{ r.numeroDocumento }}</td>
                    <td class="px-4 py-2.5 font-medium text-gray-900">{{ customerName(r.clienteId) }}</td>
                    <td class="px-4 py-2.5 font-mono text-gray-500">{{ r.fechaVencimiento.slice(0, 10) }}</td>
                    <td class="px-4 py-2.5 text-right font-mono text-gray-700">${{ r.montoOriginal.toFixed(2) }}</td>
                    <td class="px-4 py-2.5 text-right font-mono font-bold text-red-700">${{ r.saldoPendiente.toFixed(2) }}</td>
                    <td class="px-4 py-2.5 text-center">
                      <span class="rounded px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800">
                        {{ r.status }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="filteredStoreReceivablesDetails.length === 0">
                    <td colspan="7" class="px-4 py-10 text-center text-gray-400">No hay cuentas por cobrar pendientes para esta selección.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- ════════════════════════════════════════════════════════════════════
               INFORME: STOCK BAJO POR TIENDA Y DEPÓSITO
               ════════════════════════════════════════════════════════════════ -->
          <section v-else-if="activeReport === 'inv_stock_bajo_tienda'">
            <!-- Barra de Filtros -->
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
              <span class="text-xs font-bold text-gray-700">Productos con existencia inferior al stock mínimo</span>
              <div class="flex items-center gap-2">
                <label class="text-xs font-bold text-gray-600">Filtrar Tienda:</label>
                <select
                  v-model="storeLowStockTiendaFilter"
                  class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 outline-none focus:border-brand"
                >
                  <option value="ALL">🏢 Todas las Tiendas</option>
                  <option v-for="t in TIENDAS_DEFINIDAS" :key="t.sigla" :value="t.sigla">
                    {{ t.icono }} {{ t.nombre }} [{{ t.sigla }}]
                  </option>
                </select>
              </div>
            </div>

            <!-- Tabla de Detalle -->
            <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-gray-100 font-bold uppercase text-gray-600">
                    <th class="px-4 py-3">Tienda</th>
                    <th class="px-4 py-3">Almacén</th>
                    <th class="px-4 py-3">Código SKU</th>
                    <th class="px-4 py-3">Producto</th>
                    <th class="px-4 py-3 text-right">Existencia</th>
                    <th class="px-4 py-3 text-right">Mínimo</th>
                    <th class="px-4 py-3 text-center">Déficit</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="r in filteredStoreLowStockRows" :key="r.productId + r.warehouseId" class="hover:bg-gray-50">
                    <td class="px-4 py-2.5 font-bold">
                      <span class="rounded px-2 py-0.5 text-[10px] font-bold bg-gray-100 border border-gray-200 text-gray-700">
                        [{{ r.tiendaSigla }}]
                      </span>
                    </td>
                    <td class="px-4 py-2.5 text-gray-700 font-medium">{{ r.almacenNombre }}</td>
                    <td class="px-4 py-2.5 font-mono font-bold text-gray-900">{{ r.sku }}</td>
                    <td class="px-4 py-2.5 text-gray-900 font-semibold">{{ r.nombre }}</td>
                    <td class="px-4 py-2.5 text-right font-mono font-black text-red-600">{{ r.quantity }}</td>
                    <td class="px-4 py-2.5 text-right font-mono font-bold text-gray-500">{{ r.minQuantity }}</td>
                    <td class="px-4 py-2.5 text-center">
                      <span class="rounded-full bg-red-100 px-2 py-0.5 font-mono text-[10px] font-black text-red-700">
                        -{{ r.minQuantity - r.quantity }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="filteredStoreLowStockRows.length === 0">
                    <td colspan="7" class="px-4 py-10 text-center text-emerald-600 font-bold">
                      ✅ Todos los productos cuentan con stock por encima del mínimo.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- ════════════════════════════════════════════════════════════════════
               PLACEHOLDER: Informes en desarrollo
               ════════════════════════════════════════════════════════════════ -->
          <section v-else>
            <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-32 text-center">
              <div class="mb-4 text-6xl opacity-20">📋</div>
              <h3 class="text-base font-bold text-gray-400">Informe en Desarrollo</h3>
              <p class="mt-2 text-xs text-gray-400">
                Este informe estará disponible próximamente.<br />
                Selecciona otro informe del menú lateral.
              </p>
            </div>
          </section>

        </div>
        <!-- fin área scrolleable -->

      </main>
      <!-- fin main -->

  </div>
  <!-- fin fixed full-screen -->
</template>
