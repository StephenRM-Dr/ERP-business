<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useProveedorStore } from '@/modules/master/proveedores/interfaces/proveedor.store';
import type { Compra } from '../interfaces/compra.interface';
import { useComprasStore } from '../compras.store';

const { t } = useI18n();
const comprasStore = useComprasStore();
const proveedorStore = useProveedorStore();
const currenciesStore = useCurrenciesStore();

const searchTerm = ref<string>('');
const compraToAnular = ref<Compra | null>(null);
const isAnulando = ref<boolean>(false);

onMounted(() => {
  comprasStore.fetchCompras();
  if (proveedorStore.proveedorList.length === 0) proveedorStore.fetchProveedores();
  if (currenciesStore.currencies.length === 0) currenciesStore.fetchCurrencies();
});

function proveedorLabel(proveedorId: number): string {
  return proveedorStore.getProveedorById(String(proveedorId))?.nombre ?? `#${proveedorId}`;
}

function monedaLabel(monedaId: number): string {
  return currenciesStore.currencies.find((currency) => currency.id === String(monedaId))?.code ?? `#${monedaId}`;
}

const filteredCompras = computed<Compra[]>(() =>
  comprasStore.sortedCompras.filter((compra) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      compra.numeroFactura.toLowerCase().includes(term) ||
      proveedorLabel(compra.proveedorId).toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredCompras, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmAnular(): Promise<void> {
  if (!compraToAnular.value) return;
  isAnulando.value = true;
  try {
    await comprasStore.anularCompra(compraToAnular.value.id);
    compraToAnular.value = null;
  } catch {
    // Keep the dialog open so the error message from the store is visible.
  } finally {
    isAnulando.value = false;
  }
}

function cancelAnular(): void {
  compraToAnular.value = null;
  comprasStore.anularError = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('compras.title') }}</h1>
      <RouterLink
        to="/compras/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('compras.newCompra') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="compras-search" v-model="searchTerm" />
    </div>

    <p v-if="comprasStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('compras.loading') }}
    </p>
    <p v-else-if="comprasStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(comprasStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('compras.numeroFactura') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('compras.fechaEmision') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('compras.proveedor') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('compras.form.totalNeto') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="compra in pagination.pageItems.value"
              :key="compra.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ compra.numeroFactura }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ compra.fechaEmision.slice(0, 10) }}</td>
              <td class="px-5 py-3.5 font-semibold text-gray-800">{{ proveedorLabel(compra.proveedorId) }}</td>
              <td class="px-5 py-3.5 text-gray-700">
                {{ compra.totalNeto.toFixed(2) }} {{ monedaLabel(compra.monedaId) }}
              </td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="compra.status"
                  :tone="compra.status === 'ANULADA' ? 'neutral' : 'warning'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <button
                  v-if="compra.status !== 'ANULADA'"
                  type="button"
                  class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                  @click="compraToAnular = compra"
                >
                  {{ t('compras.anular') }}
                </button>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="6" class="px-5 py-10 text-center text-sm font-semibold text-amber-700 bg-amber-50/30">
                ⚠️ No hay registros disponibles para esta sucursal.
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
      :open="compraToAnular !== null"
      :title="t('compras.anularDialog.title')"
      :message="t('compras.anularDialog.message', { name: compraToAnular?.numeroFactura ?? '' })"
      :confirm-label="t('compras.anular')"
      :confirm-disabled="isAnulando"
      destructive
      @confirm="confirmAnular"
      @cancel="cancelAnular"
    >
      <p v-if="comprasStore.anularError" class="mt-3 text-sm text-red-600">
        {{ comprasStore.anularError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
