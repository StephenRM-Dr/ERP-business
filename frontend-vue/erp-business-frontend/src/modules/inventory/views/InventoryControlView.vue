<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { usePagination } from '@/composables/usePagination';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useProductStore } from '../interfaces/product.store';
import type { Product } from '../interfaces/product.interface';
import { useWarehouseStore } from '../interfaces/warehouse.store';
import { useStockStore } from '../interfaces/stock.store';
import type { StockAdjustmentResult, StockItem } from '../interfaces/stock.interface';
import StockAdjustmentModal from '../components/StockAdjustmentModal.vue';
import StockAdjustmentPrintPreview from '../components/StockAdjustmentPrintPreview.vue';
import StockHistoryDialog from '../components/StockHistoryDialog.vue';
import CargarPreliminarModal from '../components/CargarPreliminarModal.vue';
import type { InventarioPreliminarSummary } from '../interfaces/inventario-preliminar.interface';
import { useInventoryTransformStore } from '../interfaces/inventory-transform.store';

interface StockRow {
  productId: string;
  warehouseId: string;
  stockId: string | null;
  codigo: string;
  nombre: string;
  quantity: number;
  minQuantity: number;
  permiteDecimales: boolean;
}

function rowKey(row: Pick<StockRow, 'productId' | 'warehouseId'>): string {
  return `${row.productId}-${row.warehouseId}`;
}

const { t } = useI18n();
const authStore = useAuthStore();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();
const stockStore = useStockStore();

// A user without 'general.viewAllLocations' only ever sees their own
// sucursal's warehouses here — otherwise the dropdown listed every
// warehouse company-wide regardless of who was logged in.
const canViewAllLocations = computed<boolean>(
  () => authStore.user?.rolId === 1 || authStore.hasPermission('general.viewAllLocations'),
);

function buildRow(
  product: Product,
  warehouseId: string,
  stockByKey: Map<string, StockItem>,
): StockRow {
  const stockItem = stockByKey.get(rowKey({ productId: product.id, warehouseId }));

  // No real stock row for this product/warehouse pair yet — show it at
  // quantity 0 so it can still be saved (POST /stock creates it on demand).
  return {
    productId: product.id,
    warehouseId,
    stockId: stockItem?.id ?? null,
    codigo: product.codigo,
    nombre: product.nombre,
    quantity: stockItem?.quantity ?? 0,
    minQuantity: stockItem?.minQuantity ?? 0,
    permiteDecimales: product.permiteDecimales,
  };
}

// Local editable copy: edits don't touch the store until "Guardar" is clicked per row.
// Built empty and filled in onMounted, since productStore may still be loading —
// a snapshot taken here at setup time would stay empty forever otherwise.
const rows = reactive<StockRow[]>([]);

// Rebuilding used to do a `.find()` per product/warehouse pair over the full
// product and stock arrays (O(products * warehouses * (products + stock))),
// which noticeably froze the UI once the catalog grew past a few hundred
// items. A single Map keyed by "productId-warehouseId" makes each lookup O(1).
function rebuildRows(): void {
  const stockByKey = new Map(
    stockStore.stockList.map((item) => [
      rowKey({ productId: item.productId, warehouseId: item.warehouseId }),
      item,
    ]),
  );

  rows.splice(
    0,
    rows.length,
    ...productStore.sortedProducts.flatMap((product) =>
      warehouseStore.sortedWarehouses.map((warehouse) => buildRow(product, warehouse.id, stockByKey)),
    ),
  );
}

onMounted(async () => {
  if (productStore.productList.length === 0) {
    await productStore.fetchProducts();
  }
  if (warehouseStore.warehouseList.length === 0) {
    const sucursalId = authStore.user?.sucursalId;
    await warehouseStore.fetchWarehouses(
      canViewAllLocations.value || !sucursalId ? undefined : String(sucursalId),
    );
  }
  await stockStore.fetchStock();
  rebuildRows();
});

const searchTerm = ref<string>('');
const selectedWarehouseId = ref<string>('');

const filteredRows = computed<StockRow[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (selectedWarehouseId.value === '' || row.warehouseId === selectedWarehouseId.value) &&
      (term === '' ||
        row.nombre.toLowerCase().includes(term) ||
        row.codigo.toLowerCase().includes(term)),
  );
});

const pagination = usePagination(filteredRows, 10);

watch([searchTerm, selectedWarehouseId], () => pagination.resetPage());

function warehouseName(warehouseId: string): string {
  return warehouseStore.getWarehouseById(warehouseId)?.name ?? '—';
}

function isLowStock(row: StockRow): boolean {
  return row.quantity < row.minQuantity;
}

const rowToViewHistory = ref<StockRow | null>(null);
const rowToAdjust = ref<StockRow | null>(null);
const isSavingAdjustment = ref<boolean>(false);
const adjustmentError = ref<string | null>(null);

// Set once an adjustment is saved, to show its printable AJ document —
// carries a snapshot of the row's name/code/warehouse since rowToAdjust is
// cleared before this is shown.
const adjustmentToPrint = ref<{
  result: StockAdjustmentResult;
  productName: string;
  productCode: string;
  warehouseName: string;
} | null>(null);

const transformStore = useInventoryTransformStore();
const showCargarPreliminarModal = ref<boolean>(false);

async function openAdjustmentFromPreliminar(summary: InventarioPreliminarSummary): Promise<void> {
  try {
    const detalle = await transformStore.fetchPreliminarDetalle(summary.id);
    if (detalle?.payload?.items?.[0]) {
      const firstItem = detalle.payload.items[0];
      const prod = productStore.getProductById(String(firstItem.productoId));
      if (prod) {
        const whId = String(detalle.payload.depositoId || warehouseStore.sortedWarehouses[0]?.id || '1');
        rowToAdjust.value = {
          productId: prod.id,
          warehouseId: whId,
          stockId: stockStore.getStockItem(prod.id, whId)?.id ?? null,
          codigo: prod.codigo,
          nombre: prod.nombre,
          quantity: Number(firstItem.cantidad),
          minQuantity: 0,
          permiteDecimales: prod.permiteDecimales,
        };
      }
    }
  } catch {}
}

function openAdjustment(row: StockRow): void {
  adjustmentError.value = null;
  rowToAdjust.value = row;
}

function cancelAdjustment(): void {
  rowToAdjust.value = null;
  adjustmentError.value = null;
}

async function submitAdjustment(payload: { quantity: number; reason: string }): Promise<void> {
  const row = rowToAdjust.value;
  if (!row) {
    return;
  }

  isSavingAdjustment.value = true;
  adjustmentError.value = null;
  try {
    const result = await stockStore.setQuantity(row.productId, row.warehouseId, payload.quantity, payload.reason);
    row.quantity = payload.quantity;
    row.stockId = stockStore.getStockItem(row.productId, row.warehouseId)?.id ?? row.stockId;
    rowToAdjust.value = null;
    if (result) {
      adjustmentToPrint.value = {
        result,
        productName: row.nombre,
        productCode: row.codigo,
        warehouseName: warehouseName(row.warehouseId),
      };
    }
  } catch {
    adjustmentError.value = t('inventory.control.saveError');
  } finally {
    isSavingAdjustment.value = false;
  }
}

function closeAdjustmentPrint(): void {
  adjustmentToPrint.value = null;
}

function openHistory(row: StockRow): void {
  rowToViewHistory.value = row;
}

function closeHistory(): void {
  rowToViewHistory.value = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ t('inventory.control.title') }}</h1>
        <p class="text-xs text-gray-500">Módulo de gestión y ajuste de existencias por depósito</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-brand bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand shadow-xs transition hover:bg-brand-100"
          @click="showCargarPreliminarModal = true"
        >
          <span>📥 Cargar Preliminar</span>
        </button>

        <router-link
          to="/inventory/kardex"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50"
        >
          <span>🖨️ Reimpresión y Kárdex</span>
        </router-link>
      </div>
    </div>

    <div class="mb-4">
      <SearchInput
        id="control-search"
        v-model="searchTerm"
        :placeholder="t('inventory.products.searchPlaceholder')"
      />

      <label for="control-warehouse-filter" class="sr-only">
        {{ t('inventory.control.warehouse') }}
      </label>
      <select
        id="control-warehouse-filter"
        v-model="selectedWarehouseId"
        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option value="">{{ t('inventory.control.allWarehouses') }}</option>
        <option
          v-for="warehouse in warehouseStore.sortedWarehouses"
          :key="warehouse.id"
          :value="warehouse.id"
        >
          [{{ warehouse.codigo }}] {{ warehouse.name }}
        </option>
      </select>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3 font-medium">{{ t('inventory.products.form.codigo') }}</th>
              <th class="px-5 py-3 font-medium">{{ t('inventory.products.form.name') }}</th>
              <th class="px-5 py-3 font-medium">{{ t('inventory.control.warehouse') }}</th>
              <th class="px-5 py-3 text-right font-medium">{{ t('inventory.control.quantity') }}</th>
              <th class="px-5 py-3 text-right font-medium">{{ t('inventory.control.minQuantity') }}</th>
              <th class="px-5 py-3 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in pagination.pageItems.value"
              :key="`${row.productId}-${row.warehouseId}`"
              class="border-t border-gray-100"
            >
              <td class="px-5 py-3 font-mono text-gray-600">{{ row.codigo }}</td>
              <td class="px-5 py-3 font-medium text-gray-800">{{ row.nombre }}</td>
              <td class="px-5 py-3 text-gray-600">{{ warehouseName(row.warehouseId) }}</td>
              <td class="px-5 py-3 text-right font-medium text-gray-800">{{ row.quantity }}</td>
              <td class="px-5 py-3 text-right text-gray-600">{{ row.minQuantity }}</td>
              <td class="px-5 py-3">
                <span
                  :class="[
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    isLowStock(row) ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700',
                  ]"
                >
                  {{ isLowStock(row) ? t('inventory.control.lowStock') : t('inventory.control.ok') }}
                </span>
              </td>
              <td class="px-5 py-3 text-right">
                <div class="flex justify-end gap-2">
                  <button
                    v-if="row.stockId"
                    type="button"
                    class="rounded-md px-2 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100"
                    @click="openHistory(row)"
                  >
                    {{ t('inventory.control.history.action') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover"
                    @click="openAdjustment(row)"
                  >
                    {{ t('inventory.control.adjustment.action') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="8" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('inventory.products.empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        :page="pagination.page.value"
        :total-pages="pagination.totalPages.value"
        :total-items="pagination.totalItems.value"
        :range-start="pagination.rangeStart.value"
        :range-end="pagination.rangeEnd.value"
        :page-size="pagination.pageSize.value"
        @update:page="pagination.page.value = $event"
        @update:pageSize="pagination.pageSize.value = $event"
      />
    </div>

    <StockHistoryDialog
      :stock-id="rowToViewHistory?.stockId ?? null"
      :product-name="rowToViewHistory?.nombre ?? ''"
      :product-code="rowToViewHistory?.codigo ?? ''"
      :warehouse-name="rowToViewHistory ? warehouseName(rowToViewHistory.warehouseId) : ''"
      @close="closeHistory"
    />

    <StockAdjustmentModal
      v-if="rowToAdjust"
      :key="rowKey(rowToAdjust)"
      :open="rowToAdjust !== null"
      :product-name="rowToAdjust.nombre"
      :product-code="rowToAdjust.codigo"
      :warehouse-name="warehouseName(rowToAdjust.warehouseId)"
      :current-quantity="rowToAdjust.quantity"
      :permite-decimales="rowToAdjust.permiteDecimales"
      :is-saving="isSavingAdjustment"
      :error-message="adjustmentError"
      @submit="submitAdjustment"
      @cancel="cancelAdjustment"
    />

    <StockAdjustmentPrintPreview
      v-if="adjustmentToPrint"
      :adjustment="adjustmentToPrint.result"
      :product-name="adjustmentToPrint.productName"
      :product-code="adjustmentToPrint.productCode"
      :warehouse-name="adjustmentToPrint.warehouseName"
      @close="closeAdjustmentPrint"
    />

    <!-- Modal de Selección y Carga de Preliminares -->
    <CargarPreliminarModal
      v-if="showCargarPreliminarModal"
      filtro-tipo="TODOS"
      @close="showCargarPreliminarModal = false"
      @select="openAdjustmentFromPreliminar"
    />
  </div>
</template>
