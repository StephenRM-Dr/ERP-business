<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useExchangeRatesStore } from '@/modules/currencies/exchange-rates.store';
import type { Currency } from '@/modules/currencies/interfaces/currency.interface';
import { useBancoStore } from '@/modules/master/bancos/interfaces/banco.store';
import { useCuentaBancariaStore } from '@/modules/master/cuentas-bancarias/interfaces/cuenta-bancaria.store';
import { formatMoney, roundCurrency, isForeignCurrency } from '@/utils/money';
import InvoiceSupervisorAuthModal from './InvoiceSupervisorAuthModal.vue';
import {
  BANK_ACCOUNT_PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL_KEYS,
  type CreateInvoicePayload,
  type InvoicePayment,
  type RegisteredPayment,
} from '../interfaces/invoice.interface';

const props = defineProps<{
  show: boolean;
  customerName: string;
  customerDocument: string;
  customerAnticipoDisponible: number;
  grandTotal: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  fleteValue: number;
  igtfAmount: number;
  applyVat?: boolean;
  applyIgtf: boolean;
  igtfAvailable: boolean;
  currentBankRate: number;
  totalsByCurrency: Array<{ code: string; amount: number }>;
  payments: RegisteredPayment[];
  paymentCondition: CreateInvoicePayload['paymentCondition'];
  termsDays: number;
  isSubmitting: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:payment-condition', val: CreateInvoicePayload['paymentCondition']): void;
  (e: 'update:terms-days', val: number): void;
  (e: 'update:apply-vat', val: boolean): void;
  (e: 'update:apply-igtf', val: boolean): void;
  (e: 'apply-anticipo'): void;
  (e: 'add-payment', payment: {
    method: InvoicePayment['method'];
    currencyCode: Currency['code'];
    amount: number;
    cuentaBancariaId: string | null;
  }): void;
  (e: 'remove-payment', paymentId: string): void;
  (e: 'submit'): void;
}>();

const { t } = useI18n();
const authStore = useAuthStore();
const currenciesStore = useCurrenciesStore();
const exchangeRatesStore = useExchangeRatesStore();
const bancoStore = useBancoStore();
const cuentaBancariaStore = useCuentaBancariaStore();

const INVOICE_CURRENCY_CODE: Currency['code'] = 'USD';
const PAYMENT_TOLERANCE = 0.01;

const showSupervisorModal = ref<boolean>(false);
const authorizedSupervisorName = ref<string>('');

const newPaymentMethod = ref<InvoicePayment['method']>('CASH');
const newPaymentCurrencyCode = ref<Currency['code']>('VES');
const newPaymentAmount = ref<number | null>(null);
const newPaymentCuentaId = ref<string>('');
const localFeedback = ref<string>('');

const canUseCreditWithoutAuth = computed<boolean>(
  () => authStore.user?.rolId === 1 || authStore.hasPermission('invoices.credit') || authStore.hasPermission('invoices'),
);

function handleSelectCondition(cond: 'CASH' | 'CREDIT'): void {
  if (cond === 'CREDIT') {
    if (canUseCreditWithoutAuth.value || authorizedSupervisorName.value) {
      emit('update:payment-condition', 'CREDIT');
    } else {
      showSupervisorModal.value = true;
    }
  } else {
    emit('update:payment-condition', 'CASH');
  }
}

function onSupervisorAuthorized(name: string): void {
  authorizedSupervisorName.value = name;
  emit('update:payment-condition', 'CREDIT');
  localFeedback.value = '';
}

const isBankAccountRequired = computed<boolean>(() =>
  BANK_ACCOUNT_PAYMENT_METHODS.includes(newPaymentMethod.value),
);

const activeCuentas = computed(() => {
  const currencyCode = (newPaymentCurrencyCode.value || '').trim().toUpperCase();

  if (currencyCode === 'USD') {
    return cuentaBancariaStore.sortedCuentas.filter((cuenta) => {
      if (!cuenta.activo) return false;
      const bancoCodigo = (bancoStore.getBancoById(String(cuenta.bancoId))?.codigo || '').toUpperCase();
      const monedaIso = (currenciesStore.getCurrencyById(String(cuenta.monedaId))?.code || '').toUpperCase();
      return (
        monedaIso === 'USD' ||
        bancoCodigo === 'ZELLE' ||
        cuenta.numeroCuenta.includes('USD') ||
        cuenta.numeroCuenta.includes('VERDE')
      );
    });
  }

  if (currencyCode === 'USDT') {
    return cuentaBancariaStore.sortedCuentas.filter((cuenta) => {
      if (!cuenta.activo) return false;
      const monedaIso = (currenciesStore.getCurrencyById(String(cuenta.monedaId))?.code || '').toUpperCase();
      return monedaIso === 'USDT' || cuenta.numeroCuenta.includes('USDT');
    });
  }

  if (currencyCode === 'COP') {
    return cuentaBancariaStore.sortedCuentas.filter((cuenta) => {
      if (!cuenta.activo) return false;
      const bancoCodigo = (bancoStore.getBancoById(String(cuenta.bancoId))?.codigo || '').toUpperCase();
      const monedaIso = (currenciesStore.getCurrencyById(String(cuenta.monedaId))?.code || '').toUpperCase();
      return monedaIso === 'COP' || bancoCodigo === 'BANCOLOMBIA';
    });
  }

  return cuentaBancariaStore.sortedCuentas.filter((cuenta) => {
    if (!cuenta.activo) return false;
    const monedaIso = (currenciesStore.getCurrencyById(String(cuenta.monedaId))?.code || '').toUpperCase();
    return monedaIso === 'VES' || (!isForeignCurrency(monedaIso) && monedaIso !== 'USD' && monedaIso !== 'USDT' && monedaIso !== 'COP');
  });
});

function cuentaLabel(cuentaId: string): string {
  const cuenta = cuentaBancariaStore.getCuentaById(cuentaId);
  if (!cuenta) return cuentaId;
  const banco = bancoStore.getBancoById(String(cuenta.bancoId));
  return banco ? `${banco.nombre} - ${cuenta.numeroCuenta}` : cuenta.numeroCuenta;
}

const availableCurrenciesForMethod = computed<Currency[]>(() => {
  const all = currenciesStore.activeCurrencies;
  switch (newPaymentMethod.value) {
    case 'MOBILE_PAYMENT':
    case 'CARD':
      return all.filter((c) => c.code === 'VES' || c.code === 'VES020');
    case 'TRANSFER':
    case 'CASH':
    default:
      return all;
  }
});

watch(newPaymentMethod, (method) => {
  const validCurrencies = availableCurrenciesForMethod.value;
  if (!validCurrencies.some((c) => c.code === newPaymentCurrencyCode.value)) {
    newPaymentCurrencyCode.value = validCurrencies[0]?.code ?? 'VES';
  }
  newPaymentCuentaId.value = '';
});

function paymentInInvoiceCurrency(payment: RegisteredPayment): number {
  return exchangeRatesStore.convert(
    payment.amount,
    payment.currencyCode,
    INVOICE_CURRENCY_CODE,
  );
}

const paidTotal = computed<number>(() =>
  props.payments.reduce(
    (sum, payment) => sum + paymentInInvoiceCurrency(payment),
    0,
  ),
);

const remainingAmount = computed<number>(() =>
  roundCurrency(Math.max(0, props.grandTotal - paidTotal.value)),
);

const changeAmount = computed<number>(() =>
  roundCurrency(Math.max(0, paidTotal.value - props.grandTotal)),
);

const isFullyPaid = computed<boolean>(() => remainingAmount.value <= PAYMENT_TOLERANCE);

const canSubmitCheckout = computed<boolean>(() => {
  if (props.paymentCondition === 'CREDIT') {
    return true;
  }
  return isFullyPaid.value;
});

const newPaymentEquivalent = computed<number>(() => {
  if (newPaymentAmount.value === null || newPaymentAmount.value <= 0) {
    return 0;
  }
  return exchangeRatesStore.convert(
    newPaymentAmount.value,
    newPaymentCurrencyCode.value,
    INVOICE_CURRENCY_CODE,
  );
});

function fillWithRemaining(): void {
  let neededInInvoiceCurrency = remainingAmount.value;
  const converted = exchangeRatesStore.convert(
    neededInInvoiceCurrency,
    INVOICE_CURRENCY_CODE,
    newPaymentCurrencyCode.value,
  );
  if (converted > 0) {
    newPaymentAmount.value = roundCurrency(converted);
  } else {
    newPaymentAmount.value = null;
  }
}

function handleAdd(): void {
  if (newPaymentAmount.value === null || newPaymentAmount.value <= 0) {
    localFeedback.value = 'Ingrese un monto válido';
    return;
  }

  if (newPaymentEquivalent.value === 0) {
    localFeedback.value = t('invoices.currency.missingRate');
    return;
  }

  if (isBankAccountRequired.value && newPaymentCuentaId.value === '') {
    localFeedback.value = t('invoices.payments.missingCuenta');
    return;
  }

  emit('add-payment', {
    method: newPaymentMethod.value,
    currencyCode: newPaymentCurrencyCode.value,
    amount: roundCurrency(newPaymentAmount.value),
    cuentaBancariaId: isBankAccountRequired.value ? newPaymentCuentaId.value : null,
  });

  newPaymentAmount.value = null;
  localFeedback.value = '';
}

function setPresetAmount(amountUsd: number): void {
  const converted = exchangeRatesStore.convert(
    amountUsd,
    INVOICE_CURRENCY_CODE,
    newPaymentCurrencyCode.value,
  );
  newPaymentAmount.value = roundCurrency(converted);
}

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      localFeedback.value = '';
      if (props.payments.length === 0 && props.paymentCondition === 'CASH') {
        fillWithRemaining();
      }
    }
  },
);
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    @click.self="emit('close')"
  >
    <div class="relative flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-navy-light/40 text-slate-800">
      
      <!-- 1. Header Bar -->
      <header class="flex items-center justify-between bg-gradient-to-r from-[#0f2942] via-navy to-[#18456d] px-5 py-4 text-white">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/30 border border-white/20 text-xl">
            💳
          </div>
          <div>
            <h2 class="text-base font-black tracking-tight text-white flex items-center gap-2">
              <span>Totalización y Registro de Pagos</span>
              <span class="text-xs font-mono font-bold bg-[#0b1c2b] text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40">
                POS
              </span>
            </h2>
            <p class="text-xs text-blue-200 truncate">
              Cliente: <strong class="text-white">{{ customerName }}</strong> ({{ customerDocument }})
            </p>
          </div>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white transition cursor-pointer"
          title="Cerrar (Esc)"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>

      <!-- 2. Modal Body -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        
        <!-- Totals LCD Banner -->
        <div class="rounded-2xl bg-[#0b1c2b] p-4 text-white border-2 border-brand/40 shadow-inner flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-widest text-cyan-400">MONTO TOTAL A PAGAR:</span>
            <div class="font-mono text-3xl sm:text-4xl font-black tracking-tight text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
              ${{ grandTotal.toFixed(2) }}
            </div>
            <div class="flex items-center gap-3 text-xs font-mono text-slate-300 mt-1">
              <span v-for="eq in totalsByCurrency" :key="eq.code">
                ≈ {{ eq.code }}: <strong class="text-slate-100 font-bold">{{ formatMoney(eq.amount, eq.code) }}</strong>
              </span>
            </div>
          </div>

          <!-- Breakdown mini tags with 1-click tax toggles -->
          <div class="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
            <div class="bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
              <span class="text-slate-400">Subtotal:</span> ${{ subtotal.toFixed(2) }}
            </div>
            <div v-if="discountAmount > 0" class="bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-700/60 text-emerald-300">
              <span class="text-emerald-400">Desc:</span> -${{ discountAmount.toFixed(2) }}
            </div>
            <div v-if="fleteValue > 0" class="bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
              <span class="text-slate-400">Flete:</span> +${{ fleteValue.toFixed(2) }}
            </div>
            
            <!-- IVA Toggle Button -->
            <button
              type="button"
              :class="[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition cursor-pointer',
                applyVat !== false
                  ? 'bg-blue-950/80 border-blue-500/60 text-blue-200 hover:bg-blue-900'
                  : 'bg-slate-900/60 border-slate-700 text-slate-500 line-through hover:bg-slate-800'
              ]"
              :title="applyVat !== false ? 'Clic para desactivar IVA' : 'Clic para activar IVA'"
              @click="emit('update:apply-vat', !(applyVat !== false))"
            >
              <span>IVA (16%):</span>
              <strong :class="applyVat !== false ? 'text-white' : 'text-slate-500'">${{ taxAmount.toFixed(2) }}</strong>
              <span :class="['text-[10px] px-1 py-0.2 rounded font-black', applyVat !== false ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400']">
                {{ applyVat !== false ? 'ON' : 'OFF' }}
              </span>
            </button>

            <!-- IGTF Toggle Button -->
            <button
              v-if="igtfAvailable"
              type="button"
              :class="[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition cursor-pointer',
                applyIgtf
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-200 hover:bg-amber-900'
                  : 'bg-slate-900/60 border-slate-700 text-slate-500 line-through hover:bg-slate-800'
              ]"
              :title="applyIgtf ? 'Clic para desactivar IGTF' : 'Clic para activar IGTF'"
              @click="emit('update:apply-igtf', !applyIgtf)"
            >
              <span>IGTF:</span>
              <strong :class="applyIgtf ? 'text-white' : 'text-slate-500'">${{ igtfAmount.toFixed(2) }}</strong>
              <span :class="['text-[10px] px-1 py-0.2 rounded font-black', applyIgtf ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400']">
                {{ applyIgtf ? 'ON' : 'OFF' }}
              </span>
            </button>
          </div>
        </div>

        <!-- Condition of Sale Selector (Contado vs Crédito) -->
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
          <label class="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
            Condición de la Factura:
          </label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              :class="[
                'rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-wider transition border text-center flex items-center justify-center gap-2 cursor-pointer',
                paymentCondition === 'CASH'
                  ? 'bg-navy text-white border-navy shadow-md'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              ]"
              @click="handleSelectCondition('CASH')"
            >
              <span>💵</span>
              <span>Pago de Contado (Inmediato)</span>
            </button>

            <button
              type="button"
              :class="[
                'rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-wider transition border text-center flex items-center justify-center gap-2 cursor-pointer',
                paymentCondition === 'CREDIT'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              ]"
              @click="handleSelectCondition('CREDIT')"
            >
              <span>📅</span>
              <span>Venta a Crédito</span>
              <span v-if="authorizedSupervisorName" class="text-[10px] bg-amber-700 px-1.5 py-0.5 rounded text-amber-100">
                Autorizado
              </span>
            </button>
          </div>

          <!-- Crédito details if selected -->
          <div
            v-if="paymentCondition === 'CREDIT'"
            class="mt-3 rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 space-y-2 animate-in fade-in"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold flex items-center gap-1.5">
                <span>🔐</span>
                <span>Venta a Crédito Habilitada</span>
                <span v-if="authorizedSupervisorName" class="font-normal text-amber-800">
                  (Por: {{ authorizedSupervisorName }})
                </span>
              </span>
              <div class="flex items-center gap-2">
                <label class="font-bold text-amber-950">Días de Crédito:</label>
                <select
                  :value="termsDays"
                  class="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-bold text-amber-950 outline-none"
                  @change="emit('update:terms-days', Number(($event.target as HTMLSelectElement).value))"
                >
                  <option :value="7">7 Días</option>
                  <option :value="15">15 Días</option>
                  <option :value="30">30 Días</option>
                  <option :value="45">45 Días</option>
                  <option :value="60">60 Días</option>
                </select>
              </div>
            </div>
            <p class="text-[11px] text-amber-800">
              La factura se emitirá como cuenta por cobrar pendiente con vencimiento en {{ termsDays }} días. No es obligatorio registrar pagos de inmediato.
            </p>
          </div>
        </div>

        <!-- Anticipo Disponible Banner if any -->
        <div
          v-if="customerAnticipoDisponible > 0"
          class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-purple-50 p-3 border border-purple-200 text-purple-900 text-xs"
        >
          <div class="flex items-center gap-2">
            <span class="text-base">💰</span>
            <span>
              El cliente tiene <strong class="font-mono text-sm text-purple-950 font-black">${{ customerAnticipoDisponible.toFixed(2) }}</strong> de Anticipo a su favor.
            </span>
          </div>
          <button
            type="button"
            class="rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 font-bold shadow-xs transition cursor-pointer"
            @click="emit('apply-anticipo')"
          >
            ⚡ Aplicar Anticipo
          </button>
        </div>

        <!-- Feedback Alert if any -->
        <div v-if="localFeedback" class="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
          {{ localFeedback }}
        </div>

        <!-- Entry Form: Methods & Currencies (Only for CASH) -->
        <div v-if="paymentCondition === 'CASH'" class="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          <!-- Method & Currency Selector (7 Cols) -->
          <div class="md:col-span-7 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                1. Selecciona Método de Pago:
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <button
                  v-for="(labelKey, method) in PAYMENT_METHOD_LABEL_KEYS"
                  :key="method"
                  type="button"
                  :class="[
                    'rounded-xl px-2.5 py-2 text-xs font-bold transition border text-center truncate cursor-pointer',
                    newPaymentMethod === method
                      ? 'bg-navy text-white border-navy shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  ]"
                  @click="newPaymentMethod = method"
                >
                  {{ t(labelKey) }}
                </button>
              </div>
            </div>

            <!-- Currency selector -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                2. Moneda de Pago:
              </label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="curr in availableCurrenciesForMethod"
                  :key="curr.code"
                  type="button"
                  :class="[
                    'rounded-lg px-3 py-1 text-xs font-mono font-bold transition border cursor-pointer',
                    newPaymentCurrencyCode === curr.code
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  ]"
                  @click="newPaymentCurrencyCode = curr.code"
                >
                  {{ curr.code }}
                </button>
              </div>
            </div>

            <!-- Bank account if required -->
            <div v-if="isBankAccountRequired">
              <label class="block text-xs font-bold text-slate-600 mb-1">
                Cuenta Bancaria Destino <span class="text-rose-500">*</span>:
              </label>
              <select
                v-model="newPaymentCuentaId"
                class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-brand shadow-xs cursor-pointer"
              >
                <option value="">-- Seleccionar Cuenta Receptora --</option>
                <option v-for="cta in activeCuentas" :key="cta.id" :value="cta.id">
                  {{ cuentaLabel(cta.id) }}
                </option>
              </select>
            </div>
          </div>

          <!-- Amount Input & Quick Fill (5 Cols) -->
          <div class="md:col-span-5 flex flex-col justify-between space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-600">
                  3. Monto a Pagar:
                </label>
                <button
                  type="button"
                  class="text-[11px] font-bold text-brand hover:underline cursor-pointer"
                  @click="fillWithRemaining"
                >
                  Saldar Restante
                </button>
              </div>

              <div class="relative">
                <input
                  v-model.number="newPaymentAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="w-full rounded-xl border-2 border-slate-300 bg-white py-2.5 pl-3 pr-16 font-mono text-base font-black text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
                  @keydown.enter.prevent="handleAdd"
                />
                <span class="absolute right-3 top-3 font-mono text-xs font-black text-slate-500">
                  {{ newPaymentCurrencyCode }}
                </span>
              </div>

              <!-- Real-time USD equivalent -->
              <div v-if="newPaymentCurrencyCode !== INVOICE_CURRENCY_CODE && newPaymentEquivalent > 0" class="mt-1 text-right font-mono text-xs text-slate-500">
                Equivale a: <strong class="text-slate-800 font-black">${{ newPaymentEquivalent.toFixed(2) }}</strong>
              </div>

              <!-- Fast Dollar Presets -->
              <div class="mt-3 flex flex-wrap gap-1.5">
                <button
                  v-for="amt in [5, 10, 20, 50, 100]"
                  :key="amt"
                  type="button"
                  class="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  @click="setPresetAmount(amt)"
                >
                  ${{ amt }}
                </button>
              </div>
            </div>

            <!-- Add Button -->
            <button
              type="button"
              :disabled="newPaymentAmount === null || newPaymentAmount <= 0 || (isBankAccountRequired && newPaymentCuentaId === '')"
              class="w-full rounded-xl bg-brand hover:bg-brand-hover disabled:bg-slate-300 disabled:cursor-not-allowed py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition cursor-pointer"
              @click="handleAdd"
            >
              + Registrar Pago
            </button>
          </div>

        </div>

        <!-- 3. Applied Payments Table (Only for CASH) -->
        <div v-if="paymentCondition === 'CASH'" class="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div class="bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
            <span>Pagos Registrados ({{ payments.length }})</span>
            <span class="font-mono text-slate-500">Total Pagado: ${{ paidTotal.toFixed(2) }}</span>
          </div>

          <div class="max-h-40 overflow-y-auto divide-y divide-slate-100">
            <div
              v-for="payment in payments"
              :key="payment.id"
              class="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-slate-50 transition"
            >
              <div class="flex items-center gap-2">
                <span class="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-800">
                  {{ payment.currencyCode }}
                </span>
                <span class="font-bold text-slate-800">
                  {{ t(PAYMENT_METHOD_LABEL_KEYS[payment.method]) }}
                </span>
                <span v-if="payment.cuentaBancariaId" class="text-slate-500 text-[11px] truncate max-w-[200px]">
                  • {{ cuentaLabel(payment.cuentaBancariaId) }}
                </span>
              </div>

              <div class="flex items-center gap-4">
                <div class="text-right">
                  <span class="font-mono font-black text-slate-900 text-sm">
                    {{ formatMoney(payment.amount, payment.currencyCode) }}
                  </span>
                  <span v-if="payment.currencyCode !== INVOICE_CURRENCY_CODE" class="block text-[10px] font-mono text-slate-400">
                    ≈ ${{ paymentInInvoiceCurrency(payment).toFixed(2) }}
                  </span>
                </div>
                <button
                  type="button"
                  class="rounded-lg p-1 text-rose-500 hover:bg-rose-50 font-bold cursor-pointer"
                  title="Eliminar pago"
                  @click="emit('remove-payment', payment.id)"
                >
                  ✕
                </button>
              </div>
            </div>

            <div v-if="payments.length === 0" class="py-6 text-center text-xs text-slate-400 italic">
              No se han registrado pagos aún. Selecciona un método y agrega el monto.
            </div>
          </div>
        </div>

        <!-- 4. Balance Summary Bar -->
        <div class="grid grid-cols-3 gap-2 text-center font-mono">
          <div class="rounded-xl bg-emerald-50 p-2.5 border border-emerald-200">
            <span class="block text-[10px] font-bold text-emerald-800 uppercase">PAGADO</span>
            <span class="text-base font-black text-emerald-950">${{ paidTotal.toFixed(2) }}</span>
          </div>
          <div :class="['rounded-xl p-2.5 border', remainingAmount > PAYMENT_TOLERANCE ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-500']">
            <span class="block text-[10px] font-bold uppercase">RESTANTE</span>
            <span class="text-base font-black">${{ remainingAmount.toFixed(2) }}</span>
          </div>
          <div :class="['rounded-xl p-2.5 border', changeAmount > PAYMENT_TOLERANCE ? 'bg-cyan-50 border-cyan-300 text-cyan-950' : 'bg-slate-50 border-slate-200 text-slate-500']">
            <span class="block text-[10px] font-bold uppercase">CAMBIO / VUELTO</span>
            <span class="text-base font-black">${{ changeAmount.toFixed(2) }}</span>
          </div>
        </div>

      </div>

      <!-- 5. Footer Actions -->
      <footer class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3.5">
        <button
          type="button"
          class="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
          @click="emit('close')"
        >
          ← Volver a Modificar Factura
        </button>

        <button
          type="button"
          :disabled="!canSubmitCheckout || isSubmitting"
          class="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition active:scale-98 flex items-center gap-2 cursor-pointer"
          @click="emit('submit')"
        >
          <SpinnerIcon v-if="isSubmitting" />
          <span>⚡ {{ isSubmitting ? 'EMITIENDO...' : (paymentCondition === 'CREDIT' ? 'CONFIRMAR FACTURA A CRÉDITO (F12)' : 'CONFIRMAR Y EMITIR FACTURA (F12)') }}</span>
        </button>
      </footer>

    </div>

    <!-- Supervisor Auth Modal for Credit -->
    <InvoiceSupervisorAuthModal
      :show="showSupervisorModal"
      action-title="Autorización de Venta a Crédito"
      @close="showSupervisorModal = false"
      @authorized="onSupervisorAuthorized"
    />
  </div>
</template>
