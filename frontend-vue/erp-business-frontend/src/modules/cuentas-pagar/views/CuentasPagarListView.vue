<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import { useProveedorStore } from '@/modules/master/proveedores/interfaces/proveedor.store';
import { useMonedaStore } from '@/modules/inventory/interfaces/moneda.store';
import type { CuentaPagar, CuentaPagarUpdateData } from '../interfaces/cuenta-pagar.interface';
import { useCuentaPagarStore } from '../interfaces/cuenta-pagar.store';

const STATUSES = ['PENDIENTE', 'PAGADO', 'ANULADO'] as const;

const { t } = useI18n();
const cuentaStore = useCuentaPagarStore();
const proveedorStore = useProveedorStore();
const monedaStore = useMonedaStore();

const searchTerm = ref<string>('');
const cuentaToEdit = ref<CuentaPagar | null>(null);
const isSaving = ref<boolean>(false);
const editForm = reactive<CuentaPagarUpdateData>({ status: 'PENDIENTE', saldoPendiente: 0 });

onMounted(() => {
  cuentaStore.fetchCuentasPagar();
  if (proveedorStore.proveedorList.length === 0) {
    proveedorStore.fetchProveedores();
  }
  if (monedaStore.monedaList.length === 0) {
    monedaStore.fetchMonedas();
  }
});

function proveedorLabel(proveedorId: number): string {
  return proveedorStore.getProveedorById(String(proveedorId))?.nombre ?? `#${proveedorId}`;
}

function monedaLabel(monedaId: number): string {
  return monedaStore.monedaList.find((moneda) => moneda.id === monedaId)?.codigoIso ?? `#${monedaId}`;
}

const filteredCuentas = computed<CuentaPagar[]>(() =>
  cuentaStore.sortedCuentas.filter((cuenta) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      cuenta.numeroDocumento.toLowerCase().includes(term) ||
      proveedorLabel(cuenta.proveedorId).toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredCuentas, 10);

watch(searchTerm, () => pagination.resetPage());

function openEdit(cuenta: CuentaPagar): void {
  cuentaToEdit.value = cuenta;
  editForm.status = cuenta.status;
  editForm.saldoPendiente = cuenta.saldoPendiente;
}

function cancelEdit(): void {
  cuentaToEdit.value = null;
  cuentaStore.saveError = null;
}

async function confirmEdit(): Promise<void> {
  if (!cuentaToEdit.value) return;
  isSaving.value = true;
  try {
    await cuentaStore.updateCuenta(cuentaToEdit.value.id, { ...editForm });
    cuentaToEdit.value = null;
  } catch {
    // Keep the dialog open so the error message from the store is visible.
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('cuentasPagar.title') }}</h1>
    </div>

    <div class="mb-4">
      <SearchInput id="cuentas-pagar-search" v-model="searchTerm" />
    </div>

    <p v-if="cuentaStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('cuentasPagar.loading') }}
    </p>
    <p v-else-if="cuentaStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(cuentaStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('cuentasPagar.numeroDocumento') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('cuentasPagar.proveedor') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('cuentasPagar.fechaVencimiento') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('cuentasPagar.saldoPendiente') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cuenta in pagination.pageItems.value"
              :key="cuenta.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ cuenta.numeroDocumento }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ proveedorLabel(cuenta.proveedorId) }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ cuenta.fechaVencimiento }}</td>
              <td class="px-5 py-3.5 text-right">
                <div class="font-semibold text-gray-800">
                  {{ cuenta.saldoPendiente.toFixed(2) }} {{ monedaLabel(cuenta.monedaId) }}
                </div>
                <div class="text-xs text-gray-400">
                  {{ t('cuentasPagar.montoOriginal') }}: {{ cuenta.montoOriginal.toFixed(2) }}
                </div>
              </td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="cuenta.status"
                  :tone="cuenta.status === 'PAGADO' ? 'success' : cuenta.status === 'ANULADO' ? 'neutral' : 'warning'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <button
                  type="button"
                  class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  @click="openEdit(cuenta)"
                >
                  {{ t('common.edit') }}
                </button>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="6" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('cuentasPagar.empty') }}
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
      :open="cuentaToEdit !== null"
      :title="t('cuentasPagar.editDialog.title')"
      :message="t('cuentasPagar.editDialog.message', { name: cuentaToEdit?.numeroDocumento ?? '' })"
      :confirm-label="t('common.save')"
      :confirm-disabled="isSaving"
      @confirm="confirmEdit"
      @cancel="cancelEdit"
    >
      <div class="mt-4 grid grid-cols-1 gap-4">
        <div>
          <label for="cxpStatus" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('common.status') }}
          </label>
          <select
            id="cxpStatus"
            v-model="editForm.status"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          >
            <option v-for="status in STATUSES" :key="status" :value="status">{{ status }}</option>
          </select>
        </div>
        <div>
          <label for="cxpSaldo" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('cuentasPagar.saldoPendiente') }}
          </label>
          <input
            id="cxpSaldo"
            v-model.number="editForm.saldoPendiente"
            type="number"
            min="0"
            step="0.01"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>
      </div>
      <p v-if="cuentaStore.saveError" class="mt-3 text-sm text-red-600">
        {{ cuentaStore.saveError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
