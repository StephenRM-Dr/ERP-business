<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import { useMonedaStore } from '@/modules/inventory/interfaces/moneda.store';
import type { MetodoPago } from '../interfaces/metodo-pago.interface';
import { useMetodoPagoStore } from '../interfaces/metodo-pago.store';

const { t } = useI18n();
const metodoStore = useMetodoPagoStore();
const monedaStore = useMonedaStore();

const searchTerm = ref<string>('');
const metodoToDelete = ref<MetodoPago | null>(null);
const isDeleting = ref<boolean>(false);

onMounted(() => {
  metodoStore.fetchMetodos();
  if (monedaStore.monedaList.length === 0) {
    monedaStore.fetchMonedas();
  }
});

function monedaLabel(monedaId: number): string {
  return monedaStore.monedaList.find((moneda) => moneda.id === monedaId)?.codigoIso ?? `#${monedaId}`;
}

const filteredMetodos = computed<MetodoPago[]>(() =>
  metodoStore.sortedMetodos.filter((metodo) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      metodo.nombre.toLowerCase().includes(term) ||
      metodo.codigo.toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredMetodos, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (metodoToDelete.value) {
    isDeleting.value = true;
    try {
      await metodoStore.deleteMetodo(metodoToDelete.value.id);
      metodoToDelete.value = null;
    } catch {
      // Keep the dialog open so the error message from the store is visible.
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  metodoToDelete.value = null;
  metodoStore.deleteError = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('master.metodosPago.title') }}</h1>
      <RouterLink
        to="/master/metodos-pago/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('master.metodosPago.newMetodo') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="metodos-pago-search" v-model="searchTerm" />
    </div>

    <p v-if="metodoStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('master.metodosPago.loading') }}
    </p>
    <p v-else-if="metodoStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(metodoStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('master.metodosPago.form.codigo') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.metodosPago.form.nombre') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.metodosPago.form.monedaId') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="metodo in pagination.pageItems.value"
              :key="metodo.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ metodo.codigo }}</td>
              <td class="px-5 py-3.5 font-semibold text-gray-800">{{ metodo.nombre }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ monedaLabel(metodo.monedaId) }}</td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="metodo.activo ? t('common.active') : t('common.inactive')"
                  :tone="metodo.activo ? 'success' : 'neutral'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/master/metodos-pago/${metodo.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="metodoToDelete = metodo"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="5" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('master.metodosPago.empty') }}
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
      :open="metodoToDelete !== null"
      :title="t('master.metodosPago.deleteDialog.title')"
      :message="t('master.metodosPago.deleteDialog.message', { name: metodoToDelete?.nombre ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    >
      <p v-if="metodoStore.deleteError" class="mt-3 text-sm text-red-600">
        {{ metodoStore.deleteError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
