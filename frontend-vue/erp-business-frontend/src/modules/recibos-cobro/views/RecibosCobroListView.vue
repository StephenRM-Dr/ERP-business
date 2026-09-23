<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { usePagination } from '@/composables/usePagination';
import { useCompanyInfo } from '@/composables/useCompanyInfo';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useCustomerStore } from '@/modules/customers/interfaces/customer.store';
import ReciboCobroPrintPreview from '../components/ReciboCobroPrintPreview.vue';
import type { ReciboCobro } from '../interfaces/recibo-cobro.interface';
import { useRecibosCobroStore } from '../recibos-cobro.store';

const { t } = useI18n();
const recibosStore = useRecibosCobroStore();
const customerStore = useCustomerStore();
const currenciesStore = useCurrenciesStore();
const { ensureLoaded: ensureCompanyLoaded, companyFor } = useCompanyInfo();

const searchTerm = ref<string>('');
const showPrintModal = ref<boolean>(false);
const printRecibo = ref<ReciboCobro | null>(null);
const printCustomer = ref<any | null>(null);

onMounted(() => {
  ensureCompanyLoaded();
  recibosStore.fetchRecibos();
  if (customerStore.customerList.length === 0) customerStore.fetchCustomers();
  if (currenciesStore.currencies.length === 0) currenciesStore.fetchCurrencies();
});

async function onPrintRecibo(recibo: ReciboCobro): Promise<void> {
  try {
    const fullRecibo = await recibosStore.fetchReciboById(recibo.id);
    printRecibo.value = fullRecibo;
  } catch {
    printRecibo.value = recibo;
  }
  printCustomer.value = customerStore.getCustomerById(String(recibo.clienteId));
  showPrintModal.value = true;
}

function clienteLabel(clienteId: number): string {
  const cliente = customerStore.getCustomerById(String(clienteId));
  return cliente ? `${cliente.firstName} ${cliente.lastName}` : `#${clienteId}`;
}

function monedaLabel(monedaId: number): string {
  return currenciesStore.currencies.find((currency) => currency.id === String(monedaId))?.code ?? `#${monedaId}`;
}

const filteredRecibos = computed<ReciboCobro[]>(() =>
  recibosStore.sortedRecibos.filter((recibo) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      recibo.numeroRecibo.toLowerCase().includes(term) ||
      clienteLabel(recibo.clienteId).toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredRecibos, 10);

watch(searchTerm, () => pagination.resetPage());
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('recibosCobro.title') }}</h1>
      <RouterLink
        to="/recibos-cobro/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('recibosCobro.newRecibo') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="recibos-cobro-search" v-model="searchTerm" />
    </div>

    <p v-if="recibosStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('recibosCobro.loading') }}
    </p>
    <p v-else-if="recibosStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(recibosStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('recibosCobro.numeroRecibo') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('recibosCobro.fechaPago') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('recibosCobro.cliente') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('recibosCobro.form.montoTotal') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('recibosCobro.formaPago') }}</th>
              <th class="px-5 py-3.5 font-medium text-center print:hidden">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="recibo in pagination.pageItems.value"
              :key="recibo.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ recibo.numeroRecibo }}</td>
              <td class="px-5 py-3.5 text-gray-700">{{ recibo.fechaPago.slice(0, 10) }}</td>
              <td class="px-5 py-3.5 font-semibold text-gray-800">{{ clienteLabel(recibo.clienteId) }}</td>
              <td class="px-5 py-3.5 text-gray-700">
                {{ recibo.montoTotal.toFixed(2) }} {{ monedaLabel(recibo.monedaPagoId) }}
              </td>
              <td class="px-5 py-3.5 text-gray-700">{{ recibo.formaPago }}</td>
              <td class="px-5 py-3.5 text-center print:hidden">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                  title="Reimprimir recibo con formato oficial"
                  @click="onPrintRecibo(recibo)"
                >
                  <span>🖨️</span> <span>Imprimir</span>
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

    <!-- Modal de Reimpresión de Recibo -->
    <ReciboCobroPrintPreview
      v-if="showPrintModal && printRecibo"
      :recibo="printRecibo"
      :customer="printCustomer"
      :company="companyFor(printRecibo.sucursalId)"
      @close="showPrintModal = false"
    />
  </div>
</template>
