<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import KpiCard from '@/components/ui/KpiCard.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { usePagination } from '@/composables/usePagination';
import { formatMoney } from '@/utils/money';
import { useCategoryStore } from '../interfaces/category.store';
import { useProductStore } from '../interfaces/product.store';
import { useStockStore } from '../interfaces/stock.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';

const { t } = useI18n();
const productStore = useProductStore();
const categoryStore = useCategoryStore();
const stockStore = useStockStore();
const warehouseStore = useWarehouseStore();

onMounted(() => {
  if (productStore.productList.length === 0) productStore.fetchProducts();
  if (categoryStore.categoryList.length === 0) categoryStore.fetchCategories();
  if (warehouseStore.warehouseList.length === 0) warehouseStore.fetchWarehouses();
  stockStore.fetchStock();
});

interface StockRow {
  productId: string;
  warehouseId: string;
  codigo: string;
  nombre: string;
  categoriaId: number;
  categoriaNombre: string;
  warehouseName: string;
  quantity: number;
  minQuantity: number;
  precioVenta: number | null;
  isLowStock: boolean;
}

const rows = computed<StockRow[]>(() =>
  stockStore.stockList.map((item) => {
    const product = productStore.getProductById(item.productId);
    const category = product ? categoryStore.getCategoryById(String(product.categoriaId)) : undefined;
    return {
      productId: item.productId,
      warehouseId: item.warehouseId,
      codigo: product?.codigo ?? '',
      nombre: product?.nombre ?? item.productId,
      categoriaId: product?.categoriaId ?? -1,
      categoriaNombre: category?.nombre ?? '—',
      warehouseName: warehouseStore.getWarehouseById(item.warehouseId)?.name ?? '—',
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      precioVenta: product?.precioVenta ?? null,
      isLowStock: item.quantity < item.minQuantity,
    };
  }),
);

const searchTerm = ref<string>('');
const selectedWarehouseId = ref<string>('');
const selectedCategoryId = ref<string>('');

const filteredRows = computed<StockRow[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();
  return rows.value.filter(
    (row) =>
      (selectedWarehouseId.value === '' || row.warehouseId === selectedWarehouseId.value) &&
      (selectedCategoryId.value === '' || String(row.categoriaId) === selectedCategoryId.value) &&
      (term === '' ||
        row.nombre.toLowerCase().includes(term) ||
        row.codigo.toLowerCase().includes(term)),
  );
});

const pagination = usePagination(filteredRows, 10);

watch([searchTerm, selectedWarehouseId, selectedCategoryId], () => pagination.resetPage());

const totalSkuCount = computed(() => productStore.productList.length);
const lowStockCount = computed(() => rows.value.filter((row) => row.isLowStock).length);
const inventoryValue = computed(() =>
  stockStore.stockList.reduce((sum, item) => {
    const cost = productStore.getProductById(item.productId)?.precioCosto ?? 0;
    return sum + cost * item.quantity;
  }, 0),
);
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ t('inventory.title') }}</h1>
      </div>
      <div class="flex gap-2">
        <RouterLink
          to="/inventory/transfers/create"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
        >
          {{ t('inventory.summary.newTransfer') }}
        </RouterLink>
        <RouterLink
          to="/inventory/control"
          class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
        >
          {{ t('inventory.summary.adjustInventory') }}
        </RouterLink>
      </div>
    </div>

    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard :label="t('inventory.summary.totalSku')" :value="String(totalSkuCount)" />
      <KpiCard
        :label="t('inventory.summary.lowStock')"
        :value="String(lowStockCount)"
        :accent="lowStockCount > 0 ? 'warning' : 'success'"
      />
      <KpiCard :label="t('inventory.summary.inventoryValue')" :value="formatMoney(inventoryValue, 'VES')" accent="success" />
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <SearchInput id="inventory-search" v-model="searchTerm" :placeholder="t('inventory.products.searchPlaceholder')" />

      <label for="inventory-warehouse-filter" class="sr-only">{{ t('inventory.control.warehouse') }}</label>
      <select
        id="inventory-warehouse-filter"
        v-model="selectedWarehouseId"
        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option value="">{{ t('reports.inventory.allWarehouses') }}</option>
        <option v-for="warehouse in warehouseStore.sortedWarehouses" :key="warehouse.id" :value="warehouse.id">
          [{{ warehouse.codigo }}] {{ warehouse.name }}
        </option>
      </select>

      <label for="inventory-category-filter" class="sr-only">{{ t('inventory.summary.categories') }}</label>
      <select
        id="inventory-category-filter"
        v-model="selectedCategoryId"
        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option value="">{{ t('inventory.summary.allCategories') }}</option>
        <option v-for="category in categoryStore.sortedCategories" :key="category.id" :value="category.id">
          {{ category.nombre }}
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
              <th class="px-5 py-3 font-medium">{{ t('inventory.summary.categoryColumn') }}</th>
              <th class="px-5 py-3 font-medium">{{ t('inventory.control.warehouse') }}</th>
              <th class="px-5 py-3 text-right font-medium">{{ t('reports.inventory.quantity') }}</th>
              <th class="px-5 py-3 text-right font-medium">{{ t('inventory.prices.cost') }}</th>
              <th class="px-5 py-3 font-medium">{{ t('common.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in pagination.pageItems.value"
              :key="`${row.productId}-${row.warehouseId}`"
              class="border-t border-gray-100"
            >
              <td class="px-5 py-3 font-mono text-brand">{{ row.codigo }}</td>
              <td class="px-5 py-3 font-medium text-gray-800">{{ row.nombre }}</td>
              <td class="px-5 py-3 text-gray-600">{{ row.categoriaNombre }}</td>
              <td class="px-5 py-3 text-gray-600">{{ row.warehouseName }}</td>
              <td class="px-5 py-3 text-right font-bold" :class="row.isLowStock ? 'text-red-600' : 'text-gray-700'">
                {{ row.quantity }}
              </td>
              <td class="px-5 py-3 text-right text-gray-600">
                {{ row.precioVenta !== null ? formatMoney(row.precioVenta, 'VES') : '—' }}
              </td>
              <td class="px-5 py-3">
                <StatusChip
                  :label="row.isLowStock ? t('inventory.control.lowStock') : t('inventory.summary.sufficientStock')"
                  :tone="row.isLowStock ? 'danger' : 'success'"
                />
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="7" class="px-5 py-10 text-center text-sm text-gray-400">
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
  </div>
</template>
