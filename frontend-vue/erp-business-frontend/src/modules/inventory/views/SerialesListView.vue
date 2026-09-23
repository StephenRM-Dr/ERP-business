<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import type { Serial } from '../interfaces/serial.interface';
import { useSerialStore } from '../interfaces/serial.store';
import { useProductStore } from '../interfaces/product.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';

const { t } = useI18n();
const serialStore = useSerialStore();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();

const searchTerm = ref<string>('');
const serialToDelete = ref<Serial | null>(null);
const isDeleting = ref<boolean>(false);

onMounted(() => {
  serialStore.fetchSeriales();
  if (productStore.productList.length === 0) {
    productStore.fetchProducts();
  }
  if (warehouseStore.warehouseList.length === 0) {
    warehouseStore.fetchWarehouses();
  }
});

function productLabel(productoId: number): string {
  const product = productStore.getProductById(String(productoId));
  return product ? `${product.codigo} — ${product.nombre}` : `#${productoId}`;
}

function warehouseLabel(depositoId: number | null): string {
  if (depositoId === null) return '—';
  return warehouseStore.getWarehouseById(String(depositoId))?.name ?? `#${depositoId}`;
}

const filteredSeriales = computed<Serial[]>(() =>
  serialStore.sortedSeriales.filter((serial) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      serial.numeroSerial.toLowerCase().includes(term) ||
      productLabel(serial.productoId).toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredSeriales, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (serialToDelete.value) {
    isDeleting.value = true;
    try {
      await serialStore.deleteSerial(serialToDelete.value.id);
      serialToDelete.value = null;
    } catch {
      // Keep the dialog open so the error message from the store is visible.
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  serialToDelete.value = null;
  serialStore.deleteError = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('inventory.seriales.title') }}</h1>
      <RouterLink
        to="/inventory/seriales/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('inventory.seriales.newSerial') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="seriales-search" v-model="searchTerm" />
    </div>

    <p v-if="serialStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('inventory.seriales.loading') }}
    </p>
    <p v-else-if="serialStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(serialStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.seriales.form.numeroSerial') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.seriales.form.productoId') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.seriales.form.depositoId') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="serial in pagination.pageItems.value"
              :key="serial.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ serial.numeroSerial }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ productLabel(serial.productoId) }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ warehouseLabel(serial.depositoId) }}</td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="serial.vendido ? t('inventory.seriales.sold') : t('inventory.seriales.available')"
                  :tone="serial.vendido ? 'neutral' : 'success'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/inventory/seriales/${serial.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="serialToDelete = serial"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="5" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('inventory.seriales.empty') }}
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
      :open="serialToDelete !== null"
      :title="t('inventory.seriales.deleteDialog.title')"
      :message="t('inventory.seriales.deleteDialog.message', { name: serialToDelete?.numeroSerial ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    >
      <p v-if="serialStore.deleteError" class="mt-3 text-sm text-red-600">
        {{ serialStore.deleteError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
