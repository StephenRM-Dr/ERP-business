<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import type { Vendedor } from '../interfaces/vendedor.interface';
import { useVendedorStore } from '../interfaces/vendedor.store';

const { t } = useI18n();
const vendedorStore = useVendedorStore();

const searchTerm = ref<string>('');
const vendedorToDelete = ref<Vendedor | null>(null);
const isDeleting = ref<boolean>(false);

onMounted(() => {
  vendedorStore.fetchVendedores();
});

const filteredVendedores = computed<Vendedor[]>(() =>
  vendedorStore.sortedVendedores.filter((vendedor) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      vendedor.nombre.toLowerCase().includes(term) ||
      vendedor.codigo.toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredVendedores, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (vendedorToDelete.value) {
    isDeleting.value = true;
    try {
      await vendedorStore.deleteVendedor(vendedorToDelete.value.id);
      vendedorToDelete.value = null;
    } catch {
      // Keep the dialog open so the error message from the store is visible.
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  vendedorToDelete.value = null;
  vendedorStore.deleteError = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('master.vendedores.title') }}</h1>
      <RouterLink
        to="/master/vendedores/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('master.vendedores.newVendedor') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="vendedores-search" v-model="searchTerm" />
    </div>

    <p v-if="vendedorStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('master.vendedores.loading') }}
    </p>
    <p v-else-if="vendedorStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(vendedorStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('master.vendedores.form.codigo') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.vendedores.form.nombre') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.vendedores.form.telefono') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="vendedor in pagination.pageItems.value"
              :key="vendedor.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ vendedor.codigo }}</td>
              <td class="px-5 py-3.5 font-semibold text-gray-800">{{ vendedor.nombre }}</td>
              <td class="px-5 py-3.5 text-gray-600">{{ vendedor.telefono || '—' }}</td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="vendedor.activo ? t('common.active') : t('common.inactive')"
                  :tone="vendedor.activo ? 'success' : 'neutral'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/master/vendedores/${vendedor.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="vendedorToDelete = vendedor"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="5" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('master.vendedores.empty') }}
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
      :open="vendedorToDelete !== null"
      :title="t('master.vendedores.deleteDialog.title')"
      :message="t('master.vendedores.deleteDialog.message', { name: vendedorToDelete?.nombre ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    >
      <p v-if="vendedorStore.deleteError" class="mt-3 text-sm text-red-600">
        {{ vendedorStore.deleteError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
