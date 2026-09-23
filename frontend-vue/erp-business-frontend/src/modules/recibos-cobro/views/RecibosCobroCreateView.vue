<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useCustomerStore } from '@/modules/customers/interfaces/customer.store';
import { useIgtfStore } from '@/modules/invoices/igtf.store';
import { useReciboLinea } from '../composables/useReciboLinea';
import { useRecibosCobroStore } from '../recibos-cobro.store';

interface CustomerOption {
  id: string;
  name: string;
  document: string;
}

const { t } = useI18n();
const router = useRouter();
const recibosStore = useRecibosCobroStore();
const customerStore = useCustomerStore();
const currenciesStore = useCurrenciesStore();
const igtfStore = useIgtfStore();

onMounted(() => {
  if (customerStore.customerList.length === 0) customerStore.fetchCustomers();
});

// --- Customer search (same pattern as InvoiceCreateView.vue) ---
const customerOptions = computed<CustomerOption[]>(() =>
  customerStore.sortedCustomers.map((customer) => ({
    id: customer.id,
    name: `${customer.firstName} ${customer.lastName}`,
    document: `${customer.documentType}-${customer.documentNumber}`,
  })),
);
const customerSearchTerm = ref<string>('');
const selectedCustomerId = ref<string>('');
const selectedCustomerOption = computed<CustomerOption | undefined>(() =>
  customerOptions.value.find((customer) => customer.id === selectedCustomerId.value),
);
const filteredCustomerOptions = computed<CustomerOption[]>(() => {
  const term = customerSearchTerm.value.trim().toLowerCase();
  if (term.length === 0) return [];
  return customerOptions.value.filter(
    (customer) =>
      customer.name.toLowerCase().includes(term) || customer.document.toLowerCase().includes(term),
  );
});
function selectCustomer(customer: CustomerOption): void {
  selectedCustomerId.value = customer.id;
  customerSearchTerm.value = '';
}
function clearCustomerSelection(): void {
  selectedCustomerId.value = '';
  recibosStore.cuentasPendientes = [];
}

const selectedCustomerIdRef = computed(() => selectedCustomerId.value);
const {
  monedaPagoCode,
  monedaPago,
  cuentasFiltradas,
  montoAplicado,
  setMontoAplicado,
  montoTotal,
  metodoPagoId,
  metodosDisponibles,
  isBankAccountRequired,
  cuentaBancariaId,
  activeCuentas,
  cuentaLabel,
  tasaCambio,
  aplicaIgtf,
  igtfMonto,
  observaciones,
  errorMessage,
  isSubmitting,
  canSubmit,
  submitLinea,
} = useReciboLinea(selectedCustomerIdRef);

async function handleSubmit(): Promise<void> {
  const recibo = await submitLinea();
  if (recibo) {
    router.push('/recibos-cobro');
  } else if (errorMessage.value) {
    // Only refetch when submitLinea actually attempted and failed the API call —
    // not when it early-returned because canSubmit/monedaPago weren't ready yet.
    await recibosStore.fetchCuentasPendientes(Number(selectedCustomerId.value));
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('recibosCobro.newRecibo') }}</h1>

    <div class="space-y-6">
      <!-- Customer search -->
      <div class="relative">
        <label for="rc-customer-search" class="sr-only">{{ t('recibosCobro.form.selectCustomer') }}</label>

        <div
          v-if="selectedCustomerOption"
          class="flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm"
        >
          <div>
            <p class="font-medium text-gray-800">{{ selectedCustomerOption.name }}</p>
            <p class="text-xs text-gray-500">{{ selectedCustomerOption.document }}</p>
          </div>
          <button
            type="button"
            class="text-xs font-medium text-brand hover:text-brand-hover"
            @click="clearCustomerSelection"
          >
            {{ t('recibosCobro.form.changeCustomer') }}
          </button>
        </div>

        <template v-else>
          <input
            id="rc-customer-search"
            v-model="customerSearchTerm"
            type="text"
            :placeholder="t('recibosCobro.form.customerSearchPlaceholder')"
            class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <ul
            v-if="customerSearchTerm.trim().length > 0"
            class="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <li
              v-for="customer in filteredCustomerOptions"
              :key="customer.id"
              class="cursor-pointer border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-brand/10"
              @click="selectCustomer(customer)"
            >
              <p class="text-sm font-medium text-gray-800">{{ customer.name }}</p>
              <p class="text-xs text-gray-500">{{ customer.document }}</p>
            </li>
            <li v-if="filteredCustomerOptions.length === 0" class="px-4 py-3 text-sm text-gray-500">
              {{ t('common.noResults') }}
            </li>
          </ul>
        </template>
      </div>

      <div class="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <label for="rc-moneda" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('recibosCobro.form.monedaPago') }}
          </label>
          <select
            id="rc-moneda"
            v-model="monedaPagoCode"
            :disabled="selectedCustomerId === ''"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:bg-gray-50"
          >
            <option value="" disabled>{{ t('recibosCobro.form.selectMoneda') }}</option>
            <option v-for="currency in currenciesStore.activeCurrencies" :key="currency.id" :value="currency.code">
              {{ currency.code }} — {{ currency.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="rc-tasa" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('recibosCobro.form.tasaCambio') }}
          </label>
          <input
            id="rc-tasa"
            v-model.number="tasaCambio"
            type="number"
            min="0"
            step="0.0001"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div>
          <label for="rc-metodo" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('recibosCobro.form.metodoPago') }}
          </label>
          <select
            id="rc-metodo"
            v-model.number="metodoPagoId"
            :disabled="!monedaPago"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:bg-gray-50"
          >
            <option :value="null" disabled>{{ t('recibosCobro.form.selectMetodo') }}</option>
            <option v-for="metodo in metodosDisponibles" :key="metodo.id" :value="Number(metodo.id)">
              {{ metodo.nombre }}
            </option>
          </select>
        </div>

        <div v-if="isBankAccountRequired">
          <label for="rc-cuenta" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('recibosCobro.form.cuentaBancaria') }}
          </label>
          <select
            id="rc-cuenta"
            v-model="cuentaBancariaId"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          >
            <option v-for="cuenta in activeCuentas" :key="cuenta.id" :value="cuenta.id">
              {{ cuentaLabel(cuenta.id) }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="monedaPago" class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div class="border-b border-gray-100 px-5 py-3">
          <h2 class="text-sm font-semibold text-gray-700">{{ t('recibosCobro.form.cuentasPendientes') }}</h2>
        </div>
        <p v-if="recibosStore.isLoadingCuentas" class="px-5 py-6 text-center text-sm text-gray-400">
          {{ t('recibosCobro.form.loadingCuentas') }}
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="px-5 py-3 font-medium">{{ t('cuentasPagar.numeroDocumento') }}</th>
                <th class="px-5 py-3 font-medium">{{ t('recibosCobro.form.fechaVencimiento') }}</th>
                <th class="px-5 py-3 font-medium">{{ t('recibosCobro.form.saldoPendiente') }}</th>
                <th class="px-5 py-3 font-medium">{{ t('recibosCobro.form.montoAplicar') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cuenta in cuentasFiltradas" :key="cuenta.id" class="border-t border-gray-100">
                <td class="px-5 py-3 font-mono text-gray-600">{{ cuenta.numeroDocumento }}</td>
                <td class="px-5 py-3 text-gray-700">{{ cuenta.fechaVencimiento }}</td>
                <td class="px-5 py-3 text-gray-700">{{ cuenta.saldoPendiente.toFixed(2) }}</td>
                <td class="px-5 py-3">
                  <input
                    type="number"
                    min="0"
                    :max="cuenta.saldoPendiente"
                    step="0.01"
                    :value="montoAplicado(cuenta.id)"
                    :aria-label="t('recibosCobro.form.montoAplicar')"
                    class="w-32 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                    @input="setMontoAplicado(cuenta, Number(($event.target as HTMLInputElement).value))"
                  />
                </td>
              </tr>
              <tr v-if="cuentasFiltradas.length === 0">
                <td colspan="4" class="px-5 py-8 text-center text-sm text-gray-400">
                  {{ t('recibosCobro.form.noCuentasPendientes') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium text-gray-600">{{ t('recibosCobro.form.montoTotal') }}</span>
          <span class="text-lg font-bold text-gray-800">{{ montoTotal.toFixed(2) }} {{ monedaPagoCode }}</span>
        </div>
        <div v-if="aplicaIgtf" class="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>{{ t('recibosCobro.form.igtf', { rate: igtfStore.ratePercent }) }}</span>
          <span>{{ igtfMonto.toFixed(2) }} {{ monedaPagoCode }}</span>
        </div>

        <div class="mt-4">
          <label for="rc-observaciones" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('recibosCobro.form.observaciones') }}
          </label>
          <textarea
            id="rc-observaciones"
            v-model="observaciones"
            rows="2"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <p v-if="errorMessage" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ errorMessage }}
        </p>

        <div class="mt-6 flex justify-end gap-3">
          <RouterLink
            to="/recibos-cobro"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            {{ t('common.cancel') }}
          </RouterLink>
          <button
            type="button"
            :disabled="!canSubmit || isSubmitting"
            class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleSubmit"
          >
            {{ isSubmitting ? t('recibosCobro.form.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
