<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { usePagination } from '@/composables/usePagination';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useProveedorStore } from '@/modules/master/proveedores/interfaces/proveedor.store';
import type { PagoProveedor } from '../interfaces/pago-proveedor.interface';
import { usePagosProveedoresStore } from '../pagos-proveedores.store';

const { t } = useI18n();
const pagosStore = usePagosProveedoresStore();
const proveedorStore = useProveedorStore();
const currenciesStore = useCurrenciesStore();

const searchTerm = ref<string>('');

onMounted(() => {
  pagosStore.fetchPagos();
  if (proveedorStore.proveedorList.length === 0) proveedorStore.fetchProveedores();
  if (currenciesStore.currencies.length === 0) currenciesStore.fetchCurrencies();
});

function proveedorLabel(proveedorId: number): string {
  return proveedorStore.getProveedorById(String(proveedorId))?.nombre ?? `#${proveedorId}`;
}

function monedaLabel(monedaId: number): string {
  return currenciesStore.currencies.find((currency) => currency.id === String(monedaId))?.code ?? `#${monedaId}`;
}

const filteredPagos = computed<PagoProveedor[]>(() =>
  pagosStore.sortedPagos.filter((pago) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      pago.numeroPago.toLowerCase().includes(term) ||
      proveedorLabel(pago.proveedorId).toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredPagos, 10);

watch(searchTerm, () => pagination.resetPage());
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('pagosProveedores.title') }}</h1>
      <RouterLink
        to="/pagos-proveedores/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('pagosProveedores.newPago') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="pagos-proveedores-search" v-model="searchTerm" />
    </div>

    <p v-if="pagosStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('pagosProveedores.loading') }}
    </p>
    <p v-else-if="pagosStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(pagosStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('pagosProveedores.numeroPago') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('pagosProveedores.fechaPago') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('pagosProveedores.proveedor') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('pagosProveedores.form.montoTotal') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('pagosProveedores.formaPago') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pago in pagination.pageItems.value"
              :key="pago.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ pago.numeroPago }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ pago.fechaPago.slice(0, 10) }}</td>
              <td class="px-5 py-3.5 font-semibold text-gray-800">{{ proveedorLabel(pago.proveedorId) }}</td>
              <td class="px-5 py-3.5 text-gray-700">
                {{ pago.montoTotal.toFixed(2) }} {{ monedaLabel(pago.monedaPagoId) }}
              </td>
              <td class="px-5 py-3.5 text-gray-700">{{ pago.formaPago }}</td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="5" class="px-5 py-10 text-center text-sm font-semibold text-amber-700 bg-amber-50/30">
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
  </div>
</template>
