<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { usePagination } from '@/composables/usePagination';
import type { Lote } from '../interfaces/lote.interface';
import { useLoteStore } from '../interfaces/lote.store';
import { useProductStore } from '../interfaces/product.store';

const { t } = useI18n();
const loteStore = useLoteStore();
const productStore = useProductStore();

const searchTerm = ref<string>('');
const loteToDelete = ref<Lote | null>(null);
const isDeleting = ref<boolean>(false);

onMounted(() => {
  loteStore.fetchLotes();
  if (productStore.productList.length === 0) {
    productStore.fetchProducts();
  }
});

function productLabel(productoId: number): string {
  const product = productStore.getProductById(String(productoId));
  return product ? `${product.codigo} — ${product.nombre}` : `#${productoId}`;
}

const filteredLotes = computed<Lote[]>(() =>
  loteStore.sortedLotes.filter((lote) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      lote.numeroLote.toLowerCase().includes(term) ||
      productLabel(lote.productoId).toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredLotes, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (loteToDelete.value) {
    isDeleting.value = true;
    try {
      await loteStore.deleteLote(loteToDelete.value.id);
      loteToDelete.value = null;
    } catch {
      // Keep the dialog open so the error message from the store is visible.
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  loteToDelete.value = null;
  loteStore.deleteError = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('inventory.lotes.title') }}</h1>
      <RouterLink
        to="/inventory/lotes/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('inventory.lotes.newLote') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="lotes-search" v-model="searchTerm" />
    </div>

    <p v-if="loteStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('inventory.lotes.loading') }}
    </p>
    <p v-else-if="loteStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(loteStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.lotes.form.numeroLote') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.lotes.form.productoId') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.lotes.form.fechaVencimiento') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="lote in pagination.pageItems.value"
              :key="lote.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ lote.numeroLote }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ productLabel(lote.productoId) }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ lote.fechaVencimiento }}</td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/inventory/lotes/${lote.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="loteToDelete = lote"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="4" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('inventory.lotes.empty') }}
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
      :open="loteToDelete !== null"
      :title="t('inventory.lotes.deleteDialog.title')"
      :message="t('inventory.lotes.deleteDialog.message', { name: loteToDelete?.numeroLote ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    >
      <p v-if="loteStore.deleteError" class="mt-3 text-sm text-red-600">
        {{ loteStore.deleteError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
