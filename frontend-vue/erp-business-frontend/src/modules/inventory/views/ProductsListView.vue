<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { usePagination } from '@/composables/usePagination';
import { useCategoryStore } from '../interfaces/category.store';
import type { Product } from '../interfaces/product.interface';
import { useProductStore } from '../interfaces/product.store';

const { t } = useI18n();
const productStore = useProductStore();
const categoryStore = useCategoryStore();

const searchTerm = ref<string>('');
const productToDelete = ref<Product | null>(null);
const isDeleting = ref<boolean>(false);

onMounted(() => {
  if (productStore.productList.length === 0) {
    productStore.fetchProducts();
  }
  if (categoryStore.categoryList.length === 0) {
    categoryStore.fetchCategories();
  }
});

function categoryName(categoriaId: number): string {
  return categoryStore.getCategoryById(String(categoriaId))?.nombre ?? '—';
}

const sortField = ref<'codigo' | 'nombre'>('codigo');
const sortOrder = ref<'asc' | 'desc'>('asc');

function toggleSort(field: 'codigo' | 'nombre') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
  pagination.resetPage();
}

const filteredProducts = computed<Product[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();
  const list = productStore.productList.filter((product) => {
    return (
      term === '' ||
      product.nombre.toLowerCase().includes(term) ||
      product.codigo.toLowerCase().includes(term)
    );
  });

  return list.sort((a, b) => {
    let comparison = 0;
    if (sortField.value === 'codigo') {
      comparison = a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' });
    } else {
      comparison = a.nombre.localeCompare(b.nombre, undefined, { sensitivity: 'base' });
    }
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });
});

const pagination = usePagination(filteredProducts, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (productToDelete.value) {
    isDeleting.value = true;
    try {
      await productStore.deleteProduct(productToDelete.value.id);
      productToDelete.value = null;
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  productToDelete.value = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('inventory.products.title') }}</h1>
      <RouterLink
        to="/inventory/products/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('inventory.products.newProduct') }}
      </RouterLink>
    </div>

    <!-- Barra de búsqueda y controles de ordenamiento -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex-1 min-w-[240px]">
        <SearchInput id="products-search" v-model="searchTerm" :placeholder="t('inventory.products.searchPlaceholder')" />
      </div>

      <!-- Selector interactivo de ordenamiento -->
      <div class="flex items-center gap-2 text-xs">
        <span class="text-gray-500 font-medium">Ordenar por:</span>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition border shadow-xs active:scale-95"
          :class="sortField === 'codigo' ? 'bg-brand text-white border-brand' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
          @click="toggleSort('codigo')"
        >
          <span>🔢 Código</span>
          <span v-if="sortField === 'codigo'">{{ sortOrder === 'asc' ? '▲ (0-9)' : '▼ (9-0)' }}</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition border shadow-xs active:scale-95"
          :class="sortField === 'nombre' ? 'bg-brand text-white border-brand' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
          @click="toggleSort('nombre')"
        >
          <span>🏷️ Nombre</span>
          <span v-if="sortField === 'nombre'">{{ sortOrder === 'asc' ? '▲ (A-Z)' : '▼ (Z-A)' }}</span>
        </button>
      </div>
    </div>

    <p v-if="productStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('inventory.products.loading') }}
    </p>
    <p v-else-if="productStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(productStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th
                class="px-5 py-3.5 font-medium cursor-pointer hover:bg-gray-100 transition select-none"
                title="Haga clic para ordenar por Código"
                @click="toggleSort('codigo')"
              >
                <div class="flex items-center gap-1.5">
                  <span>{{ t('inventory.products.form.codigo') }}</span>
                  <span v-if="sortField === 'codigo'" class="text-xs text-brand font-bold">
                    {{ sortOrder === 'asc' ? '▲' : '▼' }}
                  </span>
                  <span v-else class="text-xs text-gray-400">⇅</span>
                </div>
              </th>
              <th
                class="px-5 py-3.5 font-medium cursor-pointer hover:bg-gray-100 transition select-none"
                title="Haga clic para ordenar por Nombre"
                @click="toggleSort('nombre')"
              >
                <div class="flex items-center gap-1.5">
                  <span>{{ t('inventory.products.form.name') }}</span>
                  <span v-if="sortField === 'nombre'" class="text-xs text-brand font-bold">
                    {{ sortOrder === 'asc' ? '▲' : '▼' }}
                  </span>
                  <span v-else class="text-xs text-gray-400">⇅</span>
                </div>
              </th>
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.products.form.categoriaId') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="product in pagination.pageItems.value"
              :key="product.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ product.codigo }}</td>
              <td class="px-5 py-3.5 font-semibold text-gray-800">{{ product.nombre }}</td>
              <td class="px-5 py-3.5 text-gray-600">{{ categoryName(product.categoriaId) }}</td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/inventory/products/${product.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="productToDelete = product"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="4" class="px-5 py-10 text-center text-sm text-gray-400">
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

    <ConfirmDialog
      :open="productToDelete !== null"
      :title="t('inventory.products.deleteDialog.title')"
      :message="t('inventory.products.deleteDialog.message', { name: productToDelete?.nombre ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
