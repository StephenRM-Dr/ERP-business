<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/modules/auth/auth.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useExchangeRatesStore } from '@/modules/currencies/exchange-rates.store';
import type { Currency } from '@/modules/currencies/interfaces/currency.interface';
import { useBancoStore } from '@/modules/master/bancos/interfaces/banco.store';
import { useCuentaBancariaStore } from '@/modules/master/cuentas-bancarias/interfaces/cuenta-bancaria.store';
import { useMetodoPagoStore } from '@/modules/master/metodos-pago/interfaces/metodo-pago.store';
import { useProveedorStore } from '@/modules/master/proveedores/interfaces/proveedor.store';
import { useIgtfStore } from '@/modules/invoices/igtf.store';
import { resolveApiErrorMessage } from '@/utils/api-error';
import { isForeignCurrency } from '@/utils/money';
import type { CreatePagoPayload, CuentaPagarPendiente } from '../interfaces/pago-proveedor.interface';
import { usePagosProveedoresStore } from '../pagos-proveedores.store';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const pagosStore = usePagosProveedoresStore();
const proveedorStore = useProveedorStore();
const currenciesStore = useCurrenciesStore();
const exchangeRatesStore = useExchangeRatesStore();
const metodoPagoStore = useMetodoPagoStore();
const cuentaBancariaStore = useCuentaBancariaStore();
const bancoStore = useBancoStore();
const igtfStore = useIgtfStore();

onMounted(() => {
  if (proveedorStore.proveedorList.length === 0) proveedorStore.fetchProveedores();
  if (currenciesStore.currencies.length === 0) currenciesStore.fetchCurrencies();
  if (metodoPagoStore.metodoList.length === 0) metodoPagoStore.fetchMetodos();
  if (cuentaBancariaStore.cuentaList.length === 0) cuentaBancariaStore.fetchCuentas();
  if (bancoStore.bancoList.length === 0) bancoStore.fetchBancos();
  if (exchangeRatesStore.rates.length === 0) exchangeRatesStore.fetchRates();
  if (!igtfStore.isLoaded) igtfStore.fetchIgtf();
});

// --- Supplier search ---
const proveedorSearchTerm = ref<string>('');
const selectedProveedorId = ref<string>('');
const selectedProveedor = computed(() => proveedorStore.getProveedorById(selectedProveedorId.value));
const filteredProveedores = computed(() => {
  const term = proveedorSearchTerm.value.trim().toLowerCase();
  if (term.length === 0) return [];
  return proveedorStore.sortedProveedores.filter(
    (proveedor) =>
      proveedor.nombre.toLowerCase().includes(term) || proveedor.rif.toLowerCase().includes(term),
  );
});
function selectProveedor(id: string): void {
  selectedProveedorId.value = id;
  proveedorSearchTerm.value = '';
}
function clearProveedorSelection(): void {
  selectedProveedorId.value = '';
  pagosStore.cuentasPendientes = [];
}

// --- Payment currency + open CxP ---
const monedaPagoCode = ref<Currency['code']>('');
const monedaPago = computed<Currency | undefined>(() => currenciesStore.findByCode(monedaPagoCode.value));

const montosAplicados = reactive<Record<string, number>>({});

async function loadCuentasPendientes(): Promise<void> {
  if (selectedProveedorId.value === '') return;
  await pagosStore.fetchCuentasPendientes(Number(selectedProveedorId.value));
}
watch(selectedProveedorId, loadCuentasPendientes);

const cuentasFiltradas = computed<CuentaPagarPendiente[]>(() => {
  if (!monedaPago.value) return [];
  return pagosStore.cuentasPendientes.filter((cuenta) => String(cuenta.monedaId) === monedaPago.value?.id);
});

watch(monedaPagoCode, () => {
  for (const key of Object.keys(montosAplicados)) delete montosAplicados[key];
});

function montoAplicado(cuentaId: string): number {
  return montosAplicados[cuentaId] ?? 0;
}
function setMontoAplicado(cuenta: CuentaPagarPendiente, value: number): void {
  montosAplicados[cuenta.id] = Math.max(0, Math.min(value, cuenta.saldoPendiente));
}

const montoTotal = computed<number>(() =>
  cuentasFiltradas.value.reduce((sum, cuenta) => sum + montoAplicado(cuenta.id), 0),
);

// --- Payment method + bank account (always required for supplier payments) ---
const metodoPagoId = ref<number | null>(null);
const metodosDisponibles = computed(() =>
  monedaPago.value
    ? metodoPagoStore.activeMetodos.filter((metodo) => String(metodo.monedaId) === monedaPago.value?.id)
    : [],
);
const selectedMetodo = computed(() =>
  metodosDisponibles.value.find((metodo) => metodo.id === String(metodoPagoId.value)),
);
watch(monedaPagoCode, () => {
  metodoPagoId.value = null;
});

const cuentaBancariaId = ref<string>('');
const activeCuentas = computed(() => {
  if (!monedaPago.value) return [];
  return cuentaBancariaStore.sortedCuentas.filter(
    (cuenta) => cuenta.activo && String(cuenta.monedaId) === monedaPago.value?.id,
  );
});
watch(activeCuentas, () => {
  if (!activeCuentas.value.some((cuenta) => cuenta.id === cuentaBancariaId.value)) {
    cuentaBancariaId.value = activeCuentas.value[0]?.id ?? '';
  }
});
function cuentaLabel(cuentaId: string): string {
  const cuenta = cuentaBancariaStore.getCuentaById(cuentaId);
  if (!cuenta) return '';
  const bancoNombre = bancoStore.getBancoById(String(cuenta.bancoId))?.nombre ?? '';
  return `${bancoNombre} — ${cuenta.numeroCuenta}`;
}

// --- Exchange rate: prefilled, editable ---
const tasaCambio = ref<number>(1);
watch(monedaPagoCode, (code) => {
  tasaCambio.value = code ? exchangeRatesStore.rateFor(code) || 1 : 1;
});

// --- IGTF: solo aplica sobre pagos en divisas (exento para VES, VES020 y cualquier tasa en Bolívares) ---
const aplicaIgtf = computed<boolean>(
  () => igtfStore.isEnabled && !!monedaPagoCode.value && isForeignCurrency(monedaPagoCode.value),
);
const igtfMonto = computed<number>(() =>
  aplicaIgtf.value ? Number((montoTotal.value * (igtfStore.ratePercent / 100)).toFixed(2)) : 0,
);

const numeroPago = ref<string>('');
const observaciones = ref<string>('');
const errorMessage = ref<string>('');
const isSubmitting = ref<boolean>(false);

const canSubmit = computed<boolean>(
  () =>
    selectedProveedorId.value !== '' &&
    monedaPago.value !== undefined &&
    numeroPago.value.trim() !== '' &&
    cuentaBancariaId.value !== '' &&
    montoTotal.value > 0,
);

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value || !monedaPago.value) return;

  const detalles = cuentasFiltradas.value
    .filter((cuenta) => montoAplicado(cuenta.id) > 0)
    .map((cuenta) => ({ cxpId: Number(cuenta.id), montoAplicado: montoAplicado(cuenta.id) }));

  if (detalles.length === 0) return;

  const payload: CreatePagoPayload = {
    proveedorId: Number(selectedProveedorId.value),
    sucursalId: authStore.user?.sucursalId ?? 0,
    numeroPago: numeroPago.value.trim(),
    formaPago: selectedMetodo.value?.codigo ?? 'TRANSFERENCIA',
    montoTotal: montoTotal.value,
    monedaPagoId: Number(monedaPago.value.id),
    tasaCambio: tasaCambio.value,
    aplicaIgtf: aplicaIgtf.value,
    igtfPorcentaje: aplicaIgtf.value ? igtfStore.ratePercent : 0,
    igtfMonto: igtfMonto.value,
    cuentaBancariaId: Number(cuentaBancariaId.value),
    usuarioId: authStore.user?.id ?? 0,
    observaciones: observaciones.value,
    detalles,
  };

  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await pagosStore.registerPago(payload);
    router.push('/pagos-proveedores');
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, t('pagosProveedores.form.saveError'));
    await loadCuentasPendientes();
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('pagosProveedores.newPago') }}</h1>

    <div class="space-y-6">
      <!-- Supplier search -->
      <div class="relative">
        <label for="pp-proveedor-search" class="sr-only">{{ t('pagosProveedores.form.selectProveedor') }}</label>

        <div
          v-if="selectedProveedor"
          class="flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm"
        >
          <div>
            <p class="font-medium text-gray-800">{{ selectedProveedor.nombre }}</p>
            <p class="text-xs text-gray-500">{{ selectedProveedor.rif }}</p>
          </div>
          <button
            type="button"
            class="text-xs font-medium text-brand hover:text-brand-hover"
            @click="clearProveedorSelection"
          >
            {{ t('pagosProveedores.form.changeProveedor') }}
          </button>
        </div>

        <template v-else>
          <input
            id="pp-proveedor-search"
            v-model="proveedorSearchTerm"
            type="text"
            :placeholder="t('pagosProveedores.form.proveedorSearchPlaceholder')"
            class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <ul
            v-if="proveedorSearchTerm.trim().length > 0"
            class="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <li
              v-for="proveedor in filteredProveedores"
              :key="proveedor.id"
              class="cursor-pointer border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-brand/10"
              @click="selectProveedor(proveedor.id)"
            >
              <p class="text-sm font-medium text-gray-800">{{ proveedor.nombre }}</p>
              <p class="text-xs text-gray-500">{{ proveedor.rif }}</p>
            </li>
            <li v-if="filteredProveedores.length === 0" class="px-4 py-3 text-sm text-gray-500">
              {{ t('common.noResults') }}
            </li>
          </ul>
        </template>
      </div>

      <div class="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <label for="pp-numero" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('pagosProveedores.form.numeroPago') }}
          </label>
          <input
            id="pp-numero"
            v-model="numeroPago"
            type="text"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div>
          <label for="pp-moneda" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('pagosProveedores.form.monedaPago') }}
          </label>
          <select
            id="pp-moneda"
            v-model="monedaPagoCode"
            :disabled="selectedProveedorId === ''"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:bg-gray-50"
          >
            <option value="" disabled>{{ t('pagosProveedores.form.selectMoneda') }}</option>
            <option v-for="currency in currenciesStore.activeCurrencies" :key="currency.id" :value="currency.code">
              {{ currency.code }} — {{ currency.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="pp-tasa" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('pagosProveedores.form.tasaCambio') }}
          </label>
          <input
            id="pp-tasa"
            v-model.number="tasaCambio"
            type="number"
            min="0"
            step="0.0001"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div>
          <label for="pp-metodo" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('pagosProveedores.form.metodoPago') }}
          </label>
          <select
            id="pp-metodo"
            v-model.number="metodoPagoId"
            :disabled="!monedaPago"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:bg-gray-50"
          >
            <option :value="null">{{ t('pagosProveedores.form.selectMetodo') }}</option>
            <option v-for="metodo in metodosDisponibles" :key="metodo.id" :value="Number(metodo.id)">
              {{ metodo.nombre }}
            </option>
          </select>
        </div>

        <div>
          <label for="pp-cuenta" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('pagosProveedores.form.cuentaBancaria') }}
          </label>
          <select
            id="pp-cuenta"
            v-model="cuentaBancariaId"
            :disabled="!monedaPago"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:bg-gray-50"
          >
            <option value="" disabled>{{ t('pagosProveedores.form.selectCuenta') }}</option>
            <option v-for="cuenta in activeCuentas" :key="cuenta.id" :value="cuenta.id">
              {{ cuentaLabel(cuenta.id) }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="monedaPago" class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div class="border-b border-gray-100 px-5 py-3">
          <h2 class="text-sm font-semibold text-gray-700">{{ t('pagosProveedores.form.cuentasPendientes') }}</h2>
        </div>
        <p v-if="pagosStore.isLoadingCuentas" class="px-5 py-6 text-center text-sm text-gray-400">
          {{ t('pagosProveedores.form.loadingCuentas') }}
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="px-5 py-3 font-medium">{{ t('cuentasPagar.numeroDocumento') }}</th>
                <th class="px-5 py-3 font-medium">{{ t('cuentasPagar.fechaVencimiento') }}</th>
                <th class="px-5 py-3 font-medium">{{ t('cuentasPagar.saldoPendiente') }}</th>
                <th class="px-5 py-3 font-medium">{{ t('pagosProveedores.form.montoAplicar') }}</th>
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
                    :aria-label="t('pagosProveedores.form.montoAplicar')"
                    class="w-32 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                    @input="setMontoAplicado(cuenta, Number(($event.target as HTMLInputElement).value))"
                  />
                </td>
              </tr>
              <tr v-if="cuentasFiltradas.length === 0">
                <td colspan="4" class="px-5 py-8 text-center text-sm text-gray-400">
                  {{ t('pagosProveedores.form.noCuentasPendientes') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium text-gray-600">{{ t('pagosProveedores.form.montoTotal') }}</span>
          <span class="text-lg font-bold text-gray-800">{{ montoTotal.toFixed(2) }} {{ monedaPagoCode }}</span>
        </div>
        <div v-if="aplicaIgtf" class="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>{{ t('pagosProveedores.form.igtf', { rate: igtfStore.ratePercent }) }}</span>
          <span>{{ igtfMonto.toFixed(2) }} {{ monedaPagoCode }}</span>
        </div>

        <div class="mt-4">
          <label for="pp-observaciones" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('pagosProveedores.form.observaciones') }}
          </label>
          <textarea
            id="pp-observaciones"
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
            to="/pagos-proveedores"
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
            {{ isSubmitting ? t('pagosProveedores.form.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
