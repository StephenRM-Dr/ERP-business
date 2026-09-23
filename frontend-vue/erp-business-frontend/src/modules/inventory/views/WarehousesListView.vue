<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import type { Warehouse } from '../interfaces/warehouse.interface';
import { useWarehouseStore } from '../interfaces/warehouse.store';

const { t } = useI18n();
const warehouseStore = useWarehouseStore();

const searchTerm = ref<string>('');
const warehouseToDelete = ref<Warehouse | null>(null);
const isDeleting = ref<boolean>(false);

onMounted(() => {
  warehouseStore.fetchWarehouses();
});

const sortField = ref<'codigo' | 'name'>('codigo');
const sortOrder = ref<'asc' | 'desc'>('asc');

function toggleSort(field: 'codigo' | 'name') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
  pagination.resetPage();
}

const filteredWarehouses = computed<Warehouse[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();
  const list = warehouseStore.warehouseList.filter((warehouse) => {
    return (
      term === '' ||
      warehouse.name.toLowerCase().includes(term) ||
      warehouse.codigo.toLowerCase().includes(term)
    );
  });

  return list.sort((a, b) => {
    let comparison = 0;
    if (sortField.value === 'codigo') {
      comparison = a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' });
    } else {
      comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });
});

const pagination = usePagination(filteredWarehouses, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (warehouseToDelete.value) {
    isDeleting.value = true;
    try {
      await warehouseStore.deleteWarehouse(warehouseToDelete.value.id);
      warehouseToDelete.value = null;
    } catch {
      // Keep the dialog open so the error message from the store is visible.
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  warehouseToDelete.value = null;
  warehouseStore.deleteError = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('inventory.warehouses.title') }}</h1>
      <RouterLink
        to="/inventory/warehouses/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('inventory.warehouses.newWarehouse') }}
      </RouterLink>
    </div>

    <!-- Barra de búsqueda y controles de ordenamiento -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex-1 min-w-[240px]">
        <SearchInput id="warehouses-search" v-model="searchTerm" />
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
          <span v-if="sortField === 'codigo'">{{ sortOrder === 'asc' ? '▲ (A-Z)' : '▼ (Z-A)' }}</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition border shadow-xs active:scale-95"
          :class="sortField === 'name' ? 'bg-brand text-white border-brand' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
          @click="toggleSort('name')"
        >
          <span>🏷️ Nombre</span>
          <span v-if="sortField === 'name'">{{ sortOrder === 'asc' ? '▲ (A-Z)' : '▼ (Z-A)' }}</span>
        </button>
      </div>
    </div>

    <p v-if="warehouseStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('inventory.warehouses.loading') }}
    </p>
    <p v-else-if="warehouseStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(warehouseStore.error) }}
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
                  <span>{{ t('inventory.warehouses.form.codigo') }}</span>
                  <span v-if="sortField === 'codigo'" class="text-xs text-brand font-bold">
                    {{ sortOrder === 'asc' ? '▲' : '▼' }}
                  </span>
                  <span v-else class="text-xs text-gray-400">⇅</span>
                </div>
              </th>
              <th
                class="px-5 py-3.5 font-medium cursor-pointer hover:bg-gray-100 transition select-none"
                title="Haga clic para ordenar por Nombre"
                @click="toggleSort('name')"
              >
                <div class="flex items-center gap-1.5">
                  <span>{{ t('inventory.warehouses.form.name') }}</span>
                  <span v-if="sortField === 'name'" class="text-xs text-brand font-bold">
                    {{ sortOrder === 'asc' ? '▲' : '▼' }}
                  </span>
                  <span v-else class="text-xs text-gray-400">⇅</span>
                </div>
              </th>
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.warehouses.form.responsable') }}</th>
              <th class="px-5 py-3.5 font-medium">Facturación</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="warehouse in pagination.pageItems.value"
              :key="warehouse.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ warehouse.codigo }}</td>
              <td class="px-5 py-3.5 font-semibold text-gray-800">{{ warehouse.name }}</td>
              <td class="px-5 py-3.5 text-gray-600">{{ warehouse.responsable || '—' }}</td>
              <td class="px-5 py-3.5">
                <span
                  v-if="warehouse.permiteFacturar !== false"
                  class="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-bold text-blue-700"
                >
                  <span>🏢</span> Habilitado
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-700"
                >
                  <span>🔒</span> Solo Almacén
                </span>
              </td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="warehouse.isActive ? t('common.active') : t('common.inactive')"
                  :tone="warehouse.isActive ? 'success' : 'neutral'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/inventory/warehouses/${warehouse.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="warehouseToDelete = warehouse"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="5" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('inventory.warehouses.empty') }}
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
      :open="warehouseToDelete !== null"
      :title="t('inventory.warehouses.deleteDialog.title')"
      :message="t('inventory.warehouses.deleteDialog.message', { name: warehouseToDelete?.name ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    >
      <p v-if="warehouseStore.deleteError" class="mt-3 text-sm text-red-600">
        {{ warehouseStore.deleteError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
