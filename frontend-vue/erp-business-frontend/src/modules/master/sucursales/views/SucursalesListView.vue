<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import { useEmpresaStore } from '@/modules/master/empresas/interfaces/empresa.store';
import { resolveApiErrorMessage } from '@/utils/api-error';
import type { Sucursal } from '../interfaces/sucursal.interface';
import { useSucursalStore } from '../interfaces/sucursal.store';

const { t } = useI18n();
const sucursalStore = useSucursalStore();
const empresaStore = useEmpresaStore();

const searchTerm = ref<string>('');
const sucursalToDelete = ref<Sucursal | null>(null);
const deleteError = ref<string>('');
const isDeleting = ref<boolean>(false);

onMounted(() => {
  sucursalStore.fetchSucursales();
  if (empresaStore.empresaList.length === 0) {
    empresaStore.fetchEmpresas();
  }
});

function empresaName(sucursal: Sucursal): string {
  return empresaStore.getEmpresaById(String(sucursal.empresaId))?.nombre ?? '—';
}

const filteredSucursales = computed<Sucursal[]>(() =>
  sucursalStore.sortedSucursales.filter((sucursal) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      sucursal.nombre.toLowerCase().includes(term) ||
      sucursal.codigo.toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredSucursales, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (!sucursalToDelete.value) {
    return;
  }
  deleteError.value = '';
  isDeleting.value = true;
  try {
    await sucursalStore.deleteSucursal(sucursalToDelete.value.id);
    sucursalToDelete.value = null;
  } catch (err) {
    deleteError.value = resolveApiErrorMessage(err, t('master.sucursales.deleteDialog.error'));
  } finally {
    isDeleting.value = false;
  }
}

function cancelDelete(): void {
  sucursalToDelete.value = null;
  deleteError.value = '';
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('master.sucursales.title') }}</h1>
      <RouterLink
        to="/master/sucursales/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('master.sucursales.newSucursal') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="sucursales-search" v-model="searchTerm" />
    </div>

    <p v-if="sucursalStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('master.sucursales.loading') }}
    </p>
    <p v-else-if="sucursalStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(sucursalStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('master.sucursales.form.codigo') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.sucursales.form.nombre') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.sucursales.form.empresaId') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="sucursal in pagination.pageItems.value"
              :key="sucursal.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ sucursal.codigo }}</td>
              <td class="px-5 py-3.5 font-semibold text-gray-800">
                {{ sucursal.nombre }}
                <span v-if="sucursal.siglas" class="ml-1 text-xs text-gray-400">({{ sucursal.siglas }})</span>
              </td>
              <td class="px-5 py-3.5 text-gray-600">{{ empresaName(sucursal) }}</td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="sucursal.activo ? t('common.active') : t('common.inactive')"
                  :tone="sucursal.activo ? 'success' : 'neutral'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/master/sucursales/${sucursal.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="sucursalToDelete = sucursal"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="5" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('master.sucursales.empty') }}
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
      :open="sucursalToDelete !== null"
      :title="t('master.sucursales.deleteDialog.title')"
      :message="t('master.sucursales.deleteDialog.message', { name: sucursalToDelete?.nombre ?? '' })"
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
