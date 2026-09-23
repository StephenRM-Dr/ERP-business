<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import { useSucursalStore } from '@/modules/master/sucursales/interfaces/sucursal.store';
import type { TipoDocumento } from '../interfaces/tipo-documento.interface';
import { useTipoDocumentoStore } from '../interfaces/tipo-documento.store';

const { t } = useI18n();
const tipoDocumentoStore = useTipoDocumentoStore();
const sucursalStore = useSucursalStore();

const searchTerm = ref<string>('');
const tipoToDelete = ref<TipoDocumento | null>(null);
const isDeleting = ref<boolean>(false);

onMounted(() => {
  tipoDocumentoStore.fetchTiposDocumentos();
  if (sucursalStore.sucursalList.length === 0) {
    sucursalStore.fetchSucursales();
  }
});

function sucursalName(sucursalId: number): string {
  return sucursalStore.getSucursalById(String(sucursalId))?.nombre ?? `#${sucursalId}`;
}

const filteredTipos = computed<TipoDocumento[]>(() =>
  tipoDocumentoStore.sortedTiposDocumentos.filter((tipo) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      tipo.nombre.toLowerCase().includes(term) ||
      tipo.codigo.toLowerCase().includes(term) ||
      sucursalName(tipo.sucursalId).toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredTipos, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (tipoToDelete.value) {
    isDeleting.value = true;
    try {
      await tipoDocumentoStore.deleteTipoDocumento(tipoToDelete.value.id);
      tipoToDelete.value = null;
    } catch {
      // Keep the dialog open so the error message from the store is visible.
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  tipoToDelete.value = null;
  tipoDocumentoStore.deleteError = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ t('master.tiposDocumentos.title') }}</h1>
        <p class="text-sm text-gray-500">{{ t('master.tiposDocumentos.description') }}</p>
      </div>
      <RouterLink
        to="/master/tipos-documentos/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('master.tiposDocumentos.newTipoDocumento') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="tipos-documentos-search" v-model="searchTerm" />
    </div>

    <p v-if="tipoDocumentoStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('master.tiposDocumentos.loading') }}
    </p>
    <p v-else-if="tipoDocumentoStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(tipoDocumentoStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('master.tiposDocumentos.form.sucursalId') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.tiposDocumentos.form.codigo') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.tiposDocumentos.form.nombre') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('master.tiposDocumentos.form.correlativoActual') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tipo in pagination.pageItems.value"
              :key="tipo.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 text-gray-600">{{ sucursalName(tipo.sucursalId) }}</td>
              <td class="px-5 py-3.5 font-mono font-semibold text-gray-800">{{ tipo.codigo }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ tipo.nombre }}</td>
              <td class="px-5 py-3.5 text-right font-mono text-gray-600">
                {{ String(tipo.correlativoActual).padStart(tipo.longitudFormato, '0') }}
              </td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="tipo.activo ? t('common.active') : t('common.inactive')"
                  :tone="tipo.activo ? 'success' : 'neutral'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/master/tipos-documentos/${tipo.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="tipoToDelete = tipo"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="6" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('master.tiposDocumentos.empty') }}
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
      :open="tipoToDelete !== null"
      :title="t('master.tiposDocumentos.deleteDialog.title')"
      :message="t('master.tiposDocumentos.deleteDialog.message', { name: tipoToDelete?.nombre ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    >
      <p v-if="tipoDocumentoStore.deleteError" class="mt-3 text-sm text-red-600">
        {{ tipoDocumentoStore.deleteError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
