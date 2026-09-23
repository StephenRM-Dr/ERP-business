<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import KpiCard from '@/components/ui/KpiCard.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useProductStore } from '@/modules/inventory/interfaces/product.store';
import { useStockStore } from '@/modules/inventory/interfaces/stock.store';
import { useWarehouseStore } from '@/modules/inventory/interfaces/warehouse.store';
import { useSucursalStore } from '@/modules/master/sucursales/interfaces/sucursal.store';
import { useAccountsReceivableStore } from '@/modules/reports/interfaces/accounts-receivable.store';
import { useSalesReportStore } from '@/modules/reports/interfaces/sales-report.store';
import { formatMoney } from '@/utils/money';

const { t, locale } = useI18n();
const authStore = useAuthStore();

const canSeeSales = computed(() => authStore.hasPermission('invoices'));
const canSeeReceivable = computed(() => authStore.hasPermission('master.informes'));
const canSeeStock = computed(() => authStore.hasPermission('inventory.summary'));
const hasAnyData = computed(() => canSeeSales.value || canSeeReceivable.value || canSeeStock.value);

const salesReportStore = useSalesReportStore();
const accountsReceivableStore = useAccountsReceivableStore();
const stockStore = useStockStore();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();
const sucursalStore = useSucursalStore();

// Selector de Pestaña Activa en el Tablero
const pestanaActiva = ref<'VENTAS' | 'CXC' | 'STOCK'>('VENTAS');

onMounted(() => {
  if (canSeeSales.value) salesReportStore.fetchEntries();
  if (canSeeReceivable.value) accountsReceivableStore.fetchEntries();
  if (canSeeStock.value) {
    stockStore.fetchStock();
    if (productStore.productList.length === 0) productStore.fetchProducts();
    if (warehouseStore.warehouseList.length === 0) warehouseStore.fetchWarehouses();
    if (sucursalStore.sucursalList.length === 0) sucursalStore.fetchSucursales();
  }
});

function isVoided(estado: string): boolean {
  return (estado || '').toUpperCase().includes('ANULA');
}

const todayStr = new Date().toISOString().slice(0, 10);
const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

// --- Filtro interactivo de Fecha para Ventas por Tienda ---
const fechaSeleccionada = ref<string>(todayStr);
const tiendaFiltroSeleccionada = ref<string>('ALL');

function cambiarDia(delta: number) {
  const parts = fechaSeleccionada.value.split('-');
  const year = Number(parts[0]) || 2026;
  const month = Number(parts[1]) || 1;
  const day = Number(parts[2]) || 1;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  fechaSeleccionada.value = date.toISOString().slice(0, 10);
}

function setHoy() {
  fechaSeleccionada.value = todayStr;
}

const fechaSeleccionadaFormateada = computed(() => {
  if (!fechaSeleccionada.value) return '';
  const parts = fechaSeleccionada.value.split('-');
  const year = Number(parts[0]) || 2026;
  const month = Number(parts[1]) || 1;
  const day = Number(parts[2]) || 1;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

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
  {
    sigla: 'SC',
    nombre: 'San Cristóbal',
    icono: '🏔️',
    colorClass: 'text-blue-700',
    bgLightClass: 'bg-blue-50/70',
    borderClass: 'border-blue-200',
    barColor: 'bg-blue-500',
  },
  {
    sigla: 'CCS',
    nombre: 'Caracas',
    icono: '🏙️',
    colorClass: 'text-indigo-700',
    bgLightClass: 'bg-indigo-50/70',
    borderClass: 'border-indigo-200',
    barColor: 'bg-indigo-500',
  },
  {
    sigla: 'CCD',
    nombre: 'La Concordia',
    icono: '🏪',
    colorClass: 'text-teal-700',
    bgLightClass: 'bg-teal-50/70',
    borderClass: 'border-teal-200',
    barColor: 'bg-teal-500',
  },
  {
    sigla: 'VLC',
    nombre: 'Valencia',
    icono: '🏭',
    colorClass: 'text-amber-700',
    bgLightClass: 'bg-amber-50/70',
    borderClass: 'border-amber-200',
    barColor: 'bg-amber-500',
  },
  {
    sigla: 'BNS',
    nombre: 'Barinas',
    icono: '🌾',
    colorClass: 'text-emerald-700',
    bgLightClass: 'bg-emerald-50/70',
    borderClass: 'border-emerald-200',
    barColor: 'bg-emerald-500',
  },
  {
    sigla: 'MCBO',
    nombre: 'Maracaibo',
    icono: '☀️',
    colorClass: 'text-orange-700',
    bgLightClass: 'bg-orange-50/70',
    borderClass: 'border-orange-200',
    barColor: 'bg-orange-500',
  },
  {
    sigla: 'MRD',
    nombre: 'Mérida',
    icono: '🚠',
    colorClass: 'text-cyan-700',
    bgLightClass: 'bg-cyan-50/70',
    borderClass: 'border-cyan-200',
    barColor: 'bg-cyan-500',
  },
  {
    sigla: 'NAC',
    nombre: 'Ventas Nacionales',
    icono: '🇻🇪',
    colorClass: 'text-purple-700',
    bgLightClass: 'bg-purple-50/70',
    borderClass: 'border-purple-200',
    barColor: 'bg-purple-600',
  },
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

// ─── 1. VENTAS POR TIENDA DEL DÍA ─────────────────────────────────────────────
const facturasDelDia = computed(() => {
  return salesReportStore.entries.filter(
    (entry) => entry.fechaEmision.slice(0, 10) === fechaSeleccionada.value && !isVoided(entry.estado),
  );
});

const totalVentasDia = computed(() => {
  return facturasDelDia.value.reduce((sum, f) => sum + f.total, 0);
});

const totalFacturasDia = computed(() => {
  return facturasDelDia.value.length;
});

const ventasPorTienda = computed(() => {
  const totalGeneral = totalVentasDia.value || 1;

  const items = TIENDAS_DEFINIDAS.map((tienda) => {
    const facturas = facturasDelDia.value.filter(
      (f) => extraerSiglaCorrelativo(f.numeroFactura) === tienda.sigla,
    );
    const total = facturas.reduce((sum, f) => sum + f.total, 0);
    const cantidad = facturas.length;
    const porcentaje = totalGeneral > 0 ? (total / totalGeneral) * 100 : 0;

    return {
      ...tienda,
      total,
      cantidad,
      porcentaje,
    };
  });

  const facturasOtras = facturasDelDia.value.filter(
    (f) => extraerSiglaCorrelativo(f.numeroFactura) === 'OTRAS',
  );
  if (facturasOtras.length > 0) {
    const totalOtras = facturasOtras.reduce((sum, f) => sum + f.total, 0);
    items.push({
      sigla: 'OTRAS',
      nombre: 'Otras Tiendas / Sin Sigla',
      icono: '📄',
      colorClass: 'text-gray-700',
      bgLightClass: 'bg-gray-50',
      borderClass: 'border-gray-200',
      barColor: 'bg-gray-400',
      total: totalOtras,
      cantidad: facturasOtras.length,
      porcentaje: totalGeneral > 0 ? (totalOtras / totalGeneral) * 100 : 0,
    });
  }

  return items;
});

const facturasDetalleFiltradas = computed(() => {
  if (tiendaFiltroSeleccionada.value === 'ALL') {
    return facturasDelDia.value;
  }
  return facturasDelDia.value.filter(
    (f) => extraerSiglaCorrelativo(f.numeroFactura) === tiendaFiltroSeleccionada.value,
  );
});

// ─── 2. CUENTAS POR COBRAR POR TIENDA ─────────────────────────────────────────
const cxcPendientes = computed(() => {
  return accountsReceivableStore.entries.filter((entry) => entry.status === 'PENDIENTE' && entry.saldoPendiente > 0);
});

const totalCxcGeneral = computed(() => {
  return cxcPendientes.value.reduce((sum, entry) => sum + entry.saldoPendiente, 0);
});

const cxcPorTienda = computed(() => {
  const totalGeneral = totalCxcGeneral.value || 1;

  const items = TIENDAS_DEFINIDAS.map((tienda) => {
    const docs = cxcPendientes.value.filter(
      (doc) => extraerSiglaCorrelativo(doc.numeroDocumento) === tienda.sigla,
    );
    const saldo = docs.reduce((sum, doc) => sum + doc.saldoPendiente, 0);
    const cantidad = docs.length;
    const porcentaje = totalGeneral > 0 ? (saldo / totalGeneral) * 100 : 0;

    return {
      ...tienda,
      saldo,
      cantidad,
      porcentaje,
    };
  });

  const docsOtras = cxcPendientes.value.filter(
    (doc) => extraerSiglaCorrelativo(doc.numeroDocumento) === 'OTRAS',
  );
  if (docsOtras.length > 0) {
    const saldoOtras = docsOtras.reduce((sum, doc) => sum + doc.saldoPendiente, 0);
    items.push({
      sigla: 'OTRAS',
      nombre: 'Otras Tiendas / Sin Sigla',
      icono: '📄',
      colorClass: 'text-gray-700',
      bgLightClass: 'bg-gray-50',
      borderClass: 'border-gray-200',
      barColor: 'bg-gray-400',
      saldo: saldoOtras,
      cantidad: docsOtras.length,
      porcentaje: totalGeneral > 0 ? (saldoOtras / totalGeneral) * 100 : 0,
    });
  }

  return items;
});

// ─── 3. STOCK BAJO POR TIENDA / DEPÓSITO ───────────────────────────────────────
interface LowStockRow {
  productId: string;
  warehouseId: string;
  almacenNombre: string;
  tiendaSigla: string;
  codigo: string;
  nombre: string;
  quantity: number;
  minQuantity: number;
}

const lowStockRows = computed<LowStockRow[]>(() =>
  stockStore.stockList
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
        codigo: product?.codigo ?? '',
        nombre: product?.nombre ?? item.productId,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
      };
    })
    .sort((a, b) => b.minQuantity - b.quantity - (a.minQuantity - a.quantity)),
);

const lowStockCount = computed(() => lowStockRows.value.length);

const stockBajoPorTienda = computed(() => {
  const totalCriticos = lowStockCount.value || 1;

  return TIENDAS_DEFINIDAS.map((tienda) => {
    const items = lowStockRows.value.filter((row) => row.tiendaSigla === tienda.sigla);
    const cantidad = items.length;
    const porcentaje = totalCriticos > 0 ? (cantidad / totalCriticos) * 100 : 0;

    return {
      ...tienda,
      cantidad,
      porcentaje,
    };
  });
});

function totalFor(dateStr: string): number {
  return salesReportStore.entries
    .filter((entry) => entry.fechaEmision.slice(0, 10) === dateStr && !isVoided(entry.estado))
    .reduce((sum, entry) => sum + entry.total, 0);
}

const salesToday = computed(() => totalFor(todayStr));
const salesYesterday = computed(() => totalFor(yesterdayStr));

const overdueCount = computed(
  () => cxcPendientes.value.filter((entry) => entry.fechaVencimiento.slice(0, 10) < todayStr).length,
);

// --- 7-day sales trend ---
const trendDays = computed(() => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    days.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
  }
  return days.map((day) => ({ day, total: totalFor(day) }));
});
const trendMax = computed(() => Math.max(1, ...trendDays.value.map((d) => d.total)));

function dayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(locale.value, { weekday: 'short' });
}

function estadoTone(estado: string): 'success' | 'danger' | 'warning' | 'neutral' {
  const upper = (estado || '').toUpperCase();
  if (upper.includes('ANULA')) return 'danger';
  if (upper === 'PENDIENTE') return 'warning';
  return 'success';
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    
    <!-- Cabecera -->
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ t('dashboard.title') }}</h1>
        <p class="text-sm text-gray-500">Métricas en tiempo real clasificadas por Tiendas y Operaciones Nacionales</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition"
          @click="
            salesReportStore.fetchEntries();
            accountsReceivableStore.fetchEntries();
            stockStore.fetchStock();
          "
        >
          🔄 Actualizar Tablero
        </button>
      </div>
    </header>

    <p v-if="!hasAnyData" class="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
      {{ t('dashboard.noAccess') }}
    </p>

    <template v-else>
      <!-- KPIs Superiores de Resumen -->
      <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          v-if="canSeeSales"
          :label="t('dashboard.kpis.salesToday')"
          :value="formatMoney(salesToday, 'USD')"
          :hint="t('dashboard.kpis.vsYesterday', { amount: formatMoney(salesYesterday, 'USD') })"
          class="cursor-pointer"
          @click="pestanaActiva = 'VENTAS'"
        />
        <KpiCard
          v-if="canSeeReceivable"
          label="Cuentas por Cobrar Total"
          :value="formatMoney(totalCxcGeneral, 'USD')"
          :hint="overdueCount > 0 ? `${overdueCount} documentos vencidos` : 'Sin documentos vencidos'"
          :accent="overdueCount > 0 ? 'danger' : 'success'"
          class="cursor-pointer"
          @click="pestanaActiva = 'CXC'"
        />
        <KpiCard
          v-if="canSeeStock"
          :label="t('dashboard.kpis.lowStock')"
          :value="String(lowStockCount)"
          hint="Productos bajo el mínimo"
          :accent="lowStockCount > 0 ? 'warning' : 'success'"
          class="cursor-pointer"
          @click="pestanaActiva = 'STOCK'"
        />
      </div>

      <!-- Barra de Navegación de Pestañas por Tienda -->
      <div class="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition"
          :class="pestanaActiva === 'VENTAS' ? 'bg-brand text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="pestanaActiva = 'VENTAS'"
        >
          <span>📊</span>
          <span>Ventas por Tienda del Día</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition"
          :class="pestanaActiva === 'CXC' ? 'bg-brand text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="pestanaActiva = 'CXC'"
        >
          <span>💳</span>
          <span>Cuentas por Cobrar por Tienda</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition"
          :class="pestanaActiva === 'STOCK' ? 'bg-brand text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="pestanaActiva = 'STOCK'"
        >
          <span>📉</span>
          <span>Stock Bajo por Tienda</span>
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════════
           PESTAÑA 1: VENTAS POR TIENDA DEL DÍA (CON FILTRO DE FECHA)
           ══════════════════════════════════════════════════════════════════════ -->
      <div v-if="pestanaActiva === 'VENTAS' && canSeeSales" class="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        
        <!-- Barra de Control y Selector de Fecha -->
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏢</span>
              <div>
                <h2 class="text-lg font-bold text-gray-800">Ventas por Tienda y Nacionales</h2>
                <p class="text-xs text-gray-500 capitalize">{{ fechaSeleccionadaFormateada }}</p>
              </div>
            </div>
          </div>

          <!-- Selector de Fecha Interactivo -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition active:scale-95"
              title="Día Anterior"
              @click="cambiarDia(-1)"
            >
              ◀ Día Anterior
            </button>

            <div class="relative">
              <input
                v-model="fechaSeleccionada"
                type="date"
                class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 outline-none shadow-xs focus:border-brand"
              />
            </div>

            <button
              type="button"
              class="rounded-lg border px-3 py-1.5 text-xs font-medium shadow-xs transition active:scale-95"
              :class="fechaSeleccionada === todayStr ? 'bg-brand text-white border-brand' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
              @click="setHoy"
            >
              Hoy
            </button>

            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition active:scale-95"
              title="Día Siguiente"
              @click="cambiarDia(1)"
            >
              Día Siguiente ▶
            </button>
          </div>
        </div>

        <!-- Barra de Resumen Consolidado del Día Consultado -->
        <div class="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl bg-gray-50 p-4 border border-gray-100">
          <div>
            <span class="text-xs uppercase tracking-wide text-gray-500 font-medium">Total Facturado en el Día</span>
            <p class="text-xl font-bold text-emerald-700">{{ formatMoney(totalVentasDia, 'USD') }}</p>
          </div>
          <div>
            <span class="text-xs uppercase tracking-wide text-gray-500 font-medium">Total Documentos / Facturas</span>
            <p class="text-xl font-bold text-gray-800">{{ totalFacturasDia }} facturas emitidas</p>
          </div>
          <div>
            <span class="text-xs uppercase tracking-wide text-gray-500 font-medium">Filtro de Detalle</span>
            <div class="mt-1">
              <select
                v-model="tiendaFiltroSeleccionada"
                class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 outline-none focus:border-brand"
              >
                <option value="ALL">🏢 Ver Todas las Tiendas</option>
                <option v-for="t in TIENDAS_DEFINIDAS" :key="t.sigla" :value="t.sigla">
                  {{ t.icono }} {{ t.nombre }} [{{ t.sigla }}]
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Cuadrícula de Tarjetas por Tienda -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div
            v-for="tienda in ventasPorTienda"
            :key="tienda.sigla"
            class="group relative flex flex-col justify-between rounded-xl border p-4 transition shadow-xs cursor-pointer hover:shadow-md"
            :class="[
              tienda.bgLightClass,
              tiendaFiltroSeleccionada === tienda.sigla ? 'ring-2 ring-brand border-brand' : tienda.borderClass,
            ]"
            @click="tiendaFiltroSeleccionada = (tiendaFiltroSeleccionada === tienda.sigla ? 'ALL' : tienda.sigla)"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-base">{{ tienda.icono }}</span>
                  <span class="font-bold text-xs text-gray-800">{{ tienda.nombre }}</span>
                </div>
                <span
                  class="rounded-full px-2 py-0.5 font-mono text-xs font-semibold border bg-white"
                  :class="[tienda.colorClass, tienda.borderClass]"
                >
                  {{ tienda.sigla }}
                </span>
              </div>

              <div class="my-2">
                <p class="text-lg font-bold text-gray-800">
                  {{ formatMoney(tienda.total, 'USD') }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ tienda.cantidad }} {{ tienda.cantidad === 1 ? 'factura' : 'facturas' }}
                </p>
              </div>
            </div>

            <div class="mt-2 pt-2 border-t border-gray-200/50">
              <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Participación</span>
                <span class="font-semibold" :class="tienda.colorClass">{{ tienda.porcentaje.toFixed(1) }}%</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="tienda.barColor"
                  :style="{ width: `${tienda.porcentaje}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabla de Facturas del Día Consultado -->
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div class="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-700 flex items-center gap-2">
              <span>📑 Facturas Emitidas</span>
              <span v-if="tiendaFiltroSeleccionada !== 'ALL'" class="rounded bg-brand/10 px-2 py-0.5 text-brand text-xs font-semibold">
                Filtro: [{{ tiendaFiltroSeleccionada }}]
              </span>
            </h3>
            <span class="text-xs text-gray-500 font-medium">{{ facturasDetalleFiltradas.length }} registros</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 font-medium border-b border-gray-100">
                  <th class="px-4 py-3">Tienda / Sigla</th>
                  <th class="px-4 py-3">Correlativo</th>
                  <th class="px-4 py-3">Hora / Fecha</th>
                  <th class="px-4 py-3 text-right">Monto Total</th>
                  <th class="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="factura in facturasDetalleFiltradas"
                  :key="factura.id"
                  class="border-t border-gray-100 hover:bg-gray-50/60 transition"
                >
                  <td class="px-4 py-3 font-medium">
                    <span
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border"
                      :class="
                        extraerSiglaCorrelativo(factura.numeroFactura) === 'NAC'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      "
                    >
                      [{{ extraerSiglaCorrelativo(factura.numeroFactura) }}]
                    </span>
                  </td>
                  <td class="px-4 py-3 font-mono text-xs text-gray-700 font-medium">{{ factura.numeroFactura }}</td>
                  <td class="px-4 py-3 text-xs text-gray-500 font-mono">{{ factura.fechaEmision }}</td>
                  <td class="px-4 py-3 text-right font-medium text-emerald-700 font-mono">
                    {{ formatMoney(factura.total, 'USD') }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <StatusChip :label="factura.estado" :tone="estadoTone(factura.estado)" />
                  </td>
                </tr>

                <tr v-if="facturasDetalleFiltradas.length === 0">
                  <td colspan="5" class="px-4 py-8 text-center text-xs text-gray-400">
                    No se registraron ventas para la fecha y tienda seleccionada.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- ══════════════════════════════════════════════════════════════════════════
           PESTAÑA 2: CUENTAS POR COBRAR POR TIENDA
           ══════════════════════════════════════════════════════════════════════ -->
      <div v-if="pestanaActiva === 'CXC' && canSeeReceivable" class="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
          <div class="flex items-center gap-2">
            <span class="text-2xl">💳</span>
            <div>
              <h2 class="text-lg font-bold text-gray-800">Cuentas por Cobrar por Tienda y Nacionales</h2>
              <p class="text-xs text-gray-500">Distribución de saldos pendientes según correlativo de emisión</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs uppercase tracking-wide text-gray-500 font-medium">Deuda Total Consolidada</span>
            <p class="text-xl font-bold text-blue-700">{{ formatMoney(totalCxcGeneral, 'USD') }}</p>
          </div>
        </div>

        <!-- Tarjetas y Gráfico de Barras de CxC -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div
            v-for="tienda in cxcPorTienda"
            :key="tienda.sigla"
            class="flex flex-col justify-between rounded-xl border p-4 shadow-xs"
            :class="[tienda.bgLightClass, tienda.borderClass]"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-base">{{ tienda.icono }}</span>
                  <span class="font-bold text-xs text-gray-800">{{ tienda.nombre }}</span>
                </div>
                <span class="rounded-full px-2 py-0.5 font-mono text-xs font-semibold border bg-white" :class="tienda.colorClass">
                  {{ tienda.sigla }}
                </span>
              </div>

              <div class="my-2">
                <p class="text-lg font-bold text-gray-800">{{ formatMoney(tienda.saldo, 'USD') }}</p>
                <p class="text-xs text-gray-500">{{ tienda.cantidad }} documentos pendientes</p>
              </div>
            </div>

            <div class="mt-2 pt-2 border-t border-gray-200/50">
              <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>% de Deuda Total</span>
                <span class="font-semibold" :class="tienda.colorClass">{{ tienda.porcentaje.toFixed(1) }}%</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="tienda.barColor"
                  :style="{ width: `${tienda.porcentaje}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <RouterLink to="/cuentas-cobrar" class="text-xs font-semibold text-brand hover:underline">
            Ir a Cuentas por Cobrar Detalladas →
          </RouterLink>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════════
           PESTAÑA 3: STOCK BAJO POR TIENDA / DEPÓSITO
           ══════════════════════════════════════════════════════════════════════ -->
      <div v-if="pestanaActiva === 'STOCK' && canSeeStock" class="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📉</span>
            <div>
              <h2 class="text-lg font-bold text-gray-800">Alertas de Stock Bajo por Tienda y Depósito</h2>
              <p class="text-xs text-gray-500">Productos con existencias inferiores al stock mínimo requerido</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs uppercase tracking-wide text-gray-500 font-medium">Productos Críticos</span>
            <p class="text-xl font-bold text-red-600">{{ lowStockCount }} alertas</p>
          </div>
        </div>

        <!-- Tarjetas y Gráfico de Barras de Stock Bajo -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div
            v-for="tienda in stockBajoPorTienda"
            :key="tienda.sigla"
            class="flex flex-col justify-between rounded-xl border p-4 shadow-xs"
            :class="[tienda.bgLightClass, tienda.borderClass]"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-base">{{ tienda.icono }}</span>
                  <span class="font-bold text-xs text-gray-800">{{ tienda.nombre }}</span>
                </div>
                <span class="rounded-full px-2 py-0.5 font-mono text-xs font-semibold border bg-white" :class="tienda.colorClass">
                  {{ tienda.sigla }}
                </span>
              </div>

              <div class="my-2">
                <p class="text-lg font-bold" :class="tienda.cantidad > 0 ? 'text-red-700' : 'text-gray-800'">
                  {{ tienda.cantidad }} {{ tienda.cantidad === 1 ? 'producto crítico' : 'productos críticos' }}
                </p>
              </div>
            </div>

            <div class="mt-2 pt-2 border-t border-gray-200/50">
              <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Concentración de alertas</span>
                <span class="font-semibold" :class="tienda.colorClass">{{ tienda.porcentaje.toFixed(1) }}%</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="tienda.barColor"
                  :style="{ width: `${tienda.porcentaje}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Lista Detallada de Productos Críticos -->
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div class="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-700">📋 Listado de Productos Bajo Mínimo</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 font-medium border-b border-gray-100">
                  <th class="px-4 py-3">Tienda / Almacén</th>
                  <th class="px-4 py-3">Código</th>
                  <th class="px-4 py-3">Producto</th>
                  <th class="px-4 py-3 text-right">Existencia Actual</th>
                  <th class="px-4 py-3 text-right">Mínimo Requerido</th>
                  <th class="px-4 py-3 text-center">Déficit</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in lowStockRows"
                  :key="`${row.productId}-${row.warehouseId}`"
                  class="border-t border-gray-100 hover:bg-gray-50/60 transition"
                >
                  <td class="px-4 py-3 font-medium">
                    <span class="inline-flex items-center gap-1 rounded bg-gray-100 border border-gray-200 px-2 py-0.5 font-mono text-xs text-gray-700">
                      [{{ row.tiendaSigla }}] {{ row.almacenNombre }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ row.codigo }}</td>
                  <td class="px-4 py-3 font-medium text-gray-800">{{ row.nombre }}</td>
                  <td class="px-4 py-3 text-right font-mono font-bold text-red-600">{{ row.quantity }}</td>
                  <td class="px-4 py-3 text-right font-mono text-gray-500">{{ row.minQuantity }}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="rounded-full bg-red-100 px-2 py-0.5 font-mono text-xs font-semibold text-red-700">
                      -{{ row.minQuantity - row.quantity }}
                    </span>
                  </td>
                </tr>

                <tr v-if="lowStockRows.length === 0">
                  <td colspan="6" class="px-4 py-8 text-center text-xs text-emerald-600 font-semibold">
                    ✅ Todos los almacenes cuentan con stock por encima del mínimo.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Gráfico de Tendencia 7 Días -->
      <div v-if="canSeeSales" class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 class="mb-6 font-bold text-gray-800">{{ t('dashboard.salesTrend.title') }} (Últimos 7 Días)</h3>
        <div class="flex items-end justify-between gap-3 px-2" style="height: 180px">
          <div v-for="d in trendDays" :key="d.day" class="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div
              class="w-full rounded-t-md bg-brand/70 transition-all hover:bg-brand cursor-pointer shadow-2xs"
              :style="{ height: `${Math.max(4, (d.total / trendMax) * 100)}%` }"
              :title="`${d.day}: ${formatMoney(d.total, 'USD')}`"
              @click="
                fechaSeleccionada = d.day;
                pestanaActiva = 'VENTAS';
              "
            />
            <span class="text-xs font-medium uppercase text-gray-400">{{ dayLabel(d.day) }}</span>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>
