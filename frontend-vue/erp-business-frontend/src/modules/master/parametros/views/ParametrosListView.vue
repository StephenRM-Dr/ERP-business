<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import type { ParametroFiscal } from '../interfaces/parametro-fiscal.interface';
import { useParametroFiscalStore } from '../interfaces/parametro-fiscal.store';

const { t } = useI18n();
const parametroStore = useParametroFiscalStore();

const searchTerm = ref<string>('');
const parametroToDelete = ref<ParametroFiscal | null>(null);
const isDeleting = ref<boolean>(false);

onMounted(() => {
  parametroStore.fetchParametros();
});

const filteredParametros = computed<ParametroFiscal[]>(() =>
  parametroStore.sortedParametros.filter((parametro) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      parametro.codigo.toLowerCase().includes(term) ||
      parametro.descripcion.toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredParametros, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (parametroToDelete.value) {
    isDeleting.value = true;
    try {
      await parametroStore.deleteParametro(parametroToDelete.value.id);
      parametroToDelete.value = null;
    } catch {
      // Keep the dialog open so the error message from the store is visible.
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  parametroToDelete.value = null;
  parametroStore.deleteError = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('master.parametros.title') }}</h1>
      <RouterLink
        to="/master/parametros/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('master.parametros.newParametro') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="parametros-search" v-model="searchTerm" />
    </div>

    <p v-if="parametroStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('master.parametros.loading') }}
    </p>
    <p v-else-if="parametroStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(parametroStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('master.parametros.form.codigo') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.parametros.form.descripcion') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.parametros.form.porcentaje') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="parametro in pagination.pageItems.value"
              :key="parametro.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ parametro.codigo }}</td>
              <td class="px-5 py-3.5 font-semibold text-gray-800">{{ parametro.descripcion }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ parametro.porcentaje }}%</td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="parametro.activo ? t('common.active') : t('common.inactive')"
                  :tone="parametro.activo ? 'success' : 'neutral'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/master/parametros/${parametro.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="parametroToDelete = parametro"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="5" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('master.parametros.empty') }}
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
      :open="parametroToDelete !== null"
      :title="t('master.parametros.deleteDialog.title')"
      :message="t('master.parametros.deleteDialog.message', { name: parametroToDelete?.codigo ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    >
      <p v-if="parametroStore.deleteError" class="mt-3 text-sm text-red-600">
        {{ parametroStore.deleteError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
