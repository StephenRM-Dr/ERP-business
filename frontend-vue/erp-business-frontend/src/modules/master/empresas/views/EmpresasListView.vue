<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { usePagination } from '@/composables/usePagination';
import { resolveApiErrorMessage } from '@/utils/api-error';
import type { Empresa } from '../interfaces/empresa.interface';
import { useEmpresaStore } from '../interfaces/empresa.store';

const { t } = useI18n();
const empresaStore = useEmpresaStore();

const searchTerm = ref<string>('');
const empresaToDelete = ref<Empresa | null>(null);
const deleteError = ref<string>('');
const isDeleting = ref<boolean>(false);

onMounted(() => {
  empresaStore.fetchEmpresas();
});

const filteredEmpresas = computed<Empresa[]>(() =>
  empresaStore.sortedEmpresas.filter((empresa) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      empresa.nombre.toLowerCase().includes(term) ||
      empresa.rif.toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredEmpresas, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (!empresaToDelete.value) {
    return;
  }
  deleteError.value = '';
  isDeleting.value = true;
  try {
    await empresaStore.deleteEmpresa(empresaToDelete.value.id);
    empresaToDelete.value = null;
  } catch (err) {
    deleteError.value = resolveApiErrorMessage(err, t('master.empresas.deleteDialog.error'));
  } finally {
    isDeleting.value = false;
  }
}

function cancelDelete(): void {
  empresaToDelete.value = null;
  deleteError.value = '';
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('master.empresas.title') }}</h1>
      <RouterLink
        to="/master/empresas/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('master.empresas.newEmpresa') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="empresas-search" v-model="searchTerm" />
    </div>

    <p v-if="empresaStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('master.empresas.loading') }}
    </p>
    <p v-else-if="empresaStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(empresaStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('master.empresas.form.nombre') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.empresas.form.rif') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.empresas.form.telefono') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="empresa in pagination.pageItems.value"
              :key="empresa.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-semibold text-gray-800">
                {{ empresa.nombre }}
                <span v-if="empresa.siglas" class="ml-1 text-xs text-gray-400">({{ empresa.siglas }})</span>
              </td>
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ empresa.rif }}</td>
              <td class="px-5 py-3.5 text-gray-600">{{ empresa.telefono || '—' }}</td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/master/empresas/${empresa.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="empresaToDelete = empresa"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="4" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('master.empresas.empty') }}
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
      :open="empresaToDelete !== null"
      :title="t('master.empresas.deleteDialog.title')"
      :message="t('master.empresas.deleteDialog.message', { name: empresaToDelete?.nombre ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    >
      <p v-if="deleteError" class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {{ deleteError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
