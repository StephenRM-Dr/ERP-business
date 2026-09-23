<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import apiClient from '@/api/axios-client';
import ProductSearchSelect from '../components/ProductSearchSelect.vue';
import { useProductStore } from '../interfaces/product.store';
import { useStockStore } from '../interfaces/stock.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';

export interface KardexRow {
  id: string;
  movimientoId: number;
  numeroDocumento: string;
  documentoOrigen?: string | null;
  fechaOperacion: string;
  tipoMovimiento: string;
  tipoClasificado: string;
  tipoClasificadoNombre: string;
  depositoOrigenId?: number | null;
  depositoOrigenNombre?: string | null;
  depositoDestinoId?: number | null;
  depositoDestinoNombre?: string | null;
  motivo?: string | null;
  observaciones?: string | null;
  usuarioId: number;
  usuarioNombre?: string | null;
  productoId: number;
  productoCodigo: string;
  productoNombre: string;
  cantidadEntrada: number;
  cantidadSalida: number;
  costoUnitario: number;
  pesoKgUnitario: number;
  pesoTotalKg: number;
  unidadMedida: string;
}

const { t } = useI18n();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();
const stockStore = useStockStore();

// Filters State
const selectedWarehouseId = ref<string>('ALL');
const selectedProductId = ref<string>('');
const selectedTipoClasificado = ref<string>('TODOS');
const fechaDesde = ref<string>('');
const fechaHasta = ref<string>('');
const searchTerm = ref<string>('');

const kardexRows = ref<KardexRow[]>([]);
const isLoading = ref<boolean>(false);

const clasificacionesOptions = [
  { value: 'TODOS', label: 'Todas las Clasificaciones' },
  { value: 'AJUSTE', label: '⚙️ Ajuste de Existencia' },
  { value: 'CARGO', label: '📥 Cargo (Entrada Directa)' },
  { value: 'DESCARGO', label: '📤 Descargo (Salida Directa)' },
  { value: 'CARGO_TRANSFORMACION', label: '📦 Cargo (Transformación)' },
  { value: 'DESCARGO_TRANSFORMACION', label: '✂️ Descargo (Transformación)' },
  { value: 'VENTA', label: '🛒 Venta / Facturación' },
  { value: 'COMPRA', label: '🚚 Compra a Proveedor' },
  { value: 'TRANSFERENCIA', label: '↔️ Transferencia entre Almacenes' },
];

onMounted(async () => {
  if (productStore.productList.length === 0) {
    await productStore.fetchProducts();
  }
  if (warehouseStore.warehouseList.length === 0) {
    await warehouseStore.fetchWarehouses();
  }
  if (stockStore.stockList.length === 0) {
    await stockStore.fetchStock();
  }
  await fetchKardex();
});

function getProductStock(productId: string): number {
  if (!productId) return 0;
  if (selectedWarehouseId.value && selectedWarehouseId.value !== 'ALL') {
    return stockStore.getStockItem(productId, selectedWarehouseId.value)?.quantity ?? 0;
  }
  return stockStore.stockList
    .filter((s) => String(s.productId) === String(productId))
    .reduce((sum, s) => sum + s.quantity, 0);
}

async function fetchKardex(): Promise<void> {
  isLoading.value = true;
  try {
    const params: Record<string, string | number> = {};
    if (selectedProductId.value) params.productoId = Number(selectedProductId.value);
    if (selectedWarehouseId.value && selectedWarehouseId.value !== 'ALL') {
      params.almacenId = Number(selectedWarehouseId.value);
    }
    if (fechaDesde.value) params.fechaDesde = fechaDesde.value;
    if (fechaHasta.value) params.fechaHasta = fechaHasta.value;
    if (selectedTipoClasificado.value && selectedTipoClasificado.value !== 'TODOS') {
      params.tipoClasificado = selectedTipoClasificado.value;
    }

    const { data } = await apiClient.get<KardexRow[]>('/stock/kardex', { params });
    kardexRows.value = data;
  } catch {
    kardexRows.value = [];
  } finally {
    isLoading.value = false;
  }
}

// Client-side search filtering
const filteredKardex = computed<KardexRow[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();
  if (!term) return kardexRows.value;
  return kardexRows.value.filter(
    (r) =>
      r.numeroDocumento.toLowerCase().includes(term) ||
      r.productoCodigo.toLowerCase().includes(term) ||
      r.productoNombre.toLowerCase().includes(term) ||
      (r.motivo || '').toLowerCase().includes(term) ||
      (r.documentoOrigen || '').toLowerCase().includes(term) ||
      (r.usuarioNombre || '').toLowerCase().includes(term),
  );
});

// Summary Stats
const totalEntradas = computed<number>(() =>
  filteredKardex.value.reduce((sum, r) => sum + r.cantidadEntrada, 0),
);

const totalSalidas = computed<number>(() =>
  filteredKardex.value.reduce((sum, r) => sum + r.cantidadSalida, 0),
);

const saldoNeto = computed<number>(() => totalEntradas.value - totalSalidas.value);

const totalPesoMovido = computed<number>(() =>
  filteredKardex.value.reduce((sum, r) => sum + r.pesoTotalKg, 0),
);

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
}

function handlePrint(): void {
  window.print();
}

function getBadgeStyle(tipo: string): string {
  switch (tipo) {
    case 'CARGO_TRANSFORMACION':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    case 'DESCARGO_TRANSFORMACION':
      return 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold';
    case 'VENTA':
      return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
    case 'COMPRA':
      return 'bg-teal-100 text-teal-900 border-teal-300 font-bold';
    case 'AJUSTE':
      return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    case 'CARGO':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'DESCARGO':
      return 'bg-red-50 text-red-800 border-red-200';
    case 'TRANSFERENCIA':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
</script>

<template>
  <div class="mx-auto max-w-[1450px] p-4 font-sans text-gray-800">
    <!-- Header Title -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white shadow-md">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-gray-900">Informe Kárdex de Movimientos de Inventario</h1>
          <p class="text-xs text-gray-500">Historial completo con clasificación de origen (Ajustes, Cargos, Descargos, Transformaciones, Ventas)</p>
        </div>
      </div>

      <div class="flex items-center gap-2 print:hidden">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-brand-hover"
          @click="handlePrint"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>🖨️ Imprimir / Exportar Kárdex</span>
        </button>
      </div>
    </div>

    <!-- Panel de Filtros -->
    <div class="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
      <div class="grid gap-3 sm:grid-cols-12 items-end">
        <!-- Producto -->
        <div class="sm:col-span-4">
          <label class="mb-1 block text-xs font-bold text-gray-700">Filtrar por Producto:</label>
          <ProductSearchSelect
            v-model="selectedProductId"
            :products="productStore.sortedProductsByCode"
            :get-stock="getProductStock"
            placeholder="🔍 Todos los productos o buscar específico..."
            @select="fetchKardex"
          />
        </div>

        <!-- Almacén -->
        <div class="sm:col-span-3">
          <label class="mb-1 block text-xs font-bold text-gray-700">Depósito / Almacén:</label>
          <select
            v-model="selectedWarehouseId"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-brand"
            @change="fetchKardex"
          >
            <option value="ALL">Todos los Almacenes</option>
            <option v-for="w in warehouseStore.sortedWarehouses" :key="w.id" :value="w.id">
              [{{ w.codigo }}] {{ w.name }}
            </option>
          </select>
        </div>

        <!-- Tipo Clasificado -->
        <div class="sm:col-span-3">
          <label class="mb-1 block text-xs font-bold text-gray-700">Origen / Clasificación:</label>
          <select
            v-model="selectedTipoClasificado"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-brand"
            @change="fetchKardex"
          >
            <option v-for="opt in clasificacionesOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Buscar Texto -->
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-bold text-gray-700">Buscar Doc / Texto:</label>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Doc, motivo..."
            class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-brand"
          />
        </div>
      </div>

      <!-- Fechas Desde / Hasta -->
      <div class="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <div class="flex items-center gap-2">
          <span class="font-medium text-gray-600">Desde:</span>
          <input
            v-model="fechaDesde"
            type="date"
            class="rounded-lg border border-gray-300 px-2.5 py-1 text-xs outline-none"
            @change="fetchKardex"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="font-medium text-gray-600">Hasta:</span>
          <input
            v-model="fechaHasta"
            type="date"
            class="rounded-lg border border-gray-300 px-2.5 py-1 text-xs outline-none"
            @change="fetchKardex"
          />
        </div>
        <button
          type="button"
          class="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          @click="
            selectedProductId = '';
            selectedWarehouseId = 'ALL';
            selectedTipoClasificado = 'TODOS';
            fechaDesde = '';
            fechaHasta = '';
            searchTerm = '';
            fetchKardex();
          "
        >
          Limpiar Filtros
        </button>
      </div>
    </div>

    <!-- Metrics Cards Summary -->
    <div class="mb-5 grid gap-4 sm:grid-cols-4">
      <div class="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
        <p class="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Entradas (+)</p>
        <p class="font-mono text-xl font-black text-emerald-700 mt-1">+{{ totalEntradas }}</p>
      </div>
      <div class="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
        <p class="text-xs font-bold uppercase tracking-wider text-red-800">Total Salidas (-)</p>
        <p class="font-mono text-xl font-black text-red-700 mt-1">-{{ totalSalidas }}</p>
      </div>
      <div class="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
        <p class="text-xs font-bold uppercase tracking-wider text-blue-800">Saldo Neto Movido</p>
        <p class="font-mono text-xl font-black mt-1" :class="saldoNeto >= 0 ? 'text-blue-900' : 'text-amber-800'">
          {{ saldoNeto >= 0 ? '+' : '' }}{{ saldoNeto }}
        </p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p class="text-xs font-bold uppercase tracking-wider text-gray-600">Total Peso Movido (kg)</p>
        <p class="font-mono text-xl font-black text-gray-900 mt-1">{{ totalPesoMovido.toFixed(2) }} kg</p>
      </div>
    </div>

    <!-- Data Table -->
    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider">
              <th class="border-b px-3 py-3">Fecha / Hora</th>
              <th class="border-b px-3 py-3">Documento #</th>
              <th class="border-b px-3 py-3">Almacén</th>
              <th class="border-b px-3 py-3">Producto</th>
              <th class="border-b px-3 py-3 text-center">Clasificación / Origen</th>
              <th class="border-b px-3 py-3 text-right">Entrada (+)</th>
              <th class="border-b px-3 py-3 text-right">Salida (-)</th>
              <th class="border-b px-3 py-3 text-right">Peso Total (kg)</th>
              <th class="border-b px-3 py-3">Motivo / Explicación</th>
              <th class="border-b px-3 py-3">Usuario</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="row in filteredKardex" :key="row.id" class="hover:bg-gray-50 transition">
              <td class="px-3 py-2.5 font-mono text-gray-600 whitespace-nowrap">{{ formatDate(row.fechaOperacion) }}</td>
              <td class="px-3 py-2.5 font-mono font-bold text-gray-900 whitespace-nowrap">
                #{{ row.numeroDocumento }}
                <span v-if="row.documentoOrigen" class="block text-[10px] text-gray-400 font-normal">
                  Orig: {{ row.documentoOrigen }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-gray-800 whitespace-nowrap">
                {{ row.depositoOrigenNombre || row.depositoDestinoNombre || 'Almacén' }}
              </td>
              <td class="px-3 py-2.5 font-medium text-gray-900">
                <span class="font-mono font-bold text-brand">[{{ row.productoCodigo }}]</span>
                <span class="ml-1">{{ row.productoNombre }}</span>
              </td>
              <td class="px-3 py-2.5 text-center whitespace-nowrap">
                <span
                  class="inline-block rounded-md px-2 py-0.5 text-[10px] border"
                  :class="getBadgeStyle(row.tipoClasificado)"
                >
                  {{ row.tipoClasificadoNombre }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                <span v-if="row.cantidadEntrada > 0">+{{ row.cantidadEntrada }} {{ row.unidadMedida }}</span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-3 py-2.5 text-right font-mono font-bold text-red-700">
                <span v-if="row.cantidadSalida > 0">-{{ row.cantidadSalida }} {{ row.unidadMedida }}</span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-3 py-2.5 text-right font-mono text-blue-900 font-semibold">
                {{ row.pesoTotalKg.toFixed(2) }} kg
              </td>
              <td class="px-3 py-2.5 text-gray-700 max-w-xs truncate" :title="row.motivo || row.observaciones || ''">
                {{ row.motivo || row.observaciones || '—' }}
              </td>
              <td class="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                {{ row.usuarioNombre || 'Sistema' }}
              </td>
            </tr>

            <tr v-if="filteredKardex.length === 0 && !isLoading">
              <td colspan="10" class="px-4 py-12 text-center text-xs text-gray-400">
                No se encontraron movimientos registrados para los filtros seleccionados.
              </td>
            </tr>
            <tr v-if="isLoading">
              <td colspan="10" class="px-4 py-12 text-center text-xs text-gray-500">
                Cargando historial de Kárdex...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
