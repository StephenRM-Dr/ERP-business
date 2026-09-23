<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { useBancoStore } from '@/modules/master/bancos/interfaces/banco.store';
import { useCuentaBancariaStore } from '@/modules/master/cuentas-bancarias/interfaces/cuenta-bancaria.store';
import { formatMoney } from '@/utils/money';
import { BANK_ACCOUNT_PAYMENT_METHODS, PAYMENT_METHOD_LABEL_KEYS, type Invoice, type InvoicePayment } from '../interfaces/invoice.interface';

interface CompanyInfo {
  nombre: string;
  rif: string;
  direccionFiscal: string;
  telefono: string;
  email: string;
  sucursalNombre: string;
}

interface InvoicePrintPreviewProps {
  invoice: Invoice;
  company: CompanyInfo | null;
  /**
   * Modo preliminar: el mismo documento, pero sin nada que lo haga pasar por
   * una factura emitida — sin correlativo, sin número de control fiscal y sin
   * los pagos, con la leyenda PRELIMINAR en el encabezado.
   */
  preliminary?: boolean;
}

const props = defineProps<InvoicePrintPreviewProps>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const cuentaBancariaStore = useCuentaBancariaStore();
const bancoStore = useBancoStore();

onMounted(() => {
  if (cuentaBancariaStore.cuentaList.length === 0) {
    cuentaBancariaStore.fetchCuentas();
  }
  if (bancoStore.bancoList.length === 0) {
    bancoStore.fetchBancos();
  }
});

function handlePrint(): void {
  window.print();
}

/**
 * `invoice.subtotal` is already net of the discount (it's the taxable base
 * sent to the backend as `total_bruto`), so printing it as-is next to a
 * separate "-discount" line wouldn't add up for a reader. This reconstructs
 * the gross, pre-discount subtotal for display only.
 */
const grossSubtotal = computed(() => props.invoice.subtotal + (props.invoice.discountAmount ?? 0));

function paymentMethodLabel(method: InvoicePayment['method']): string {
  return t(PAYMENT_METHOD_LABEL_KEYS[method]);
}

/**
 * Bank name shown for TRANSFER/MOBILE_PAYMENT payments — the account number
 * itself is sensitive and must never appear on a printed/shared document.
 */
function bankAccountLabel(payment: InvoicePayment): string {
  if (!BANK_ACCOUNT_PAYMENT_METHODS.includes(payment.method) || !payment.cuentaBancariaId) {
    return '';
  }
  const cuenta = cuentaBancariaStore.getCuentaById(payment.cuentaBancariaId);
  if (!cuenta) {
    return '';
  }
  return bancoStore.getBancoById(String(cuenta.bancoId))?.nombre ?? '';
}
</script>

<template>
  <Teleport to="body">
    <div class="invoice-print-overlay fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8">
      <div class="mx-auto max-w-3xl">
        <!-- Screen-only action bar -->
        <div class="print:hidden mb-4 flex items-center justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
            @click="emit('close')"
          >
            {{ t('common.close') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
            @click="handlePrint"
          >
            {{ t('invoices.print.printButton') }}
          </button>
        </div>

        <!-- Printable document -->
        <div class="invoice-print-sheet rounded-xl bg-white p-8 shadow-xl">
          <header class="mb-6 flex items-start justify-between border-b border-gray-200 pb-4">
            <div>
              <h1 class="text-lg font-bold text-gray-900">{{ props.company?.nombre ?? '—' }}</h1>
              <p v-if="props.company?.sucursalNombre" class="text-xs text-gray-500">
                {{ props.company.sucursalNombre }}
              </p>
            </div>
            <div class="text-right">
              <h2
                class="text-base font-bold uppercase tracking-wide"
                :class="props.preliminary ? 'text-amber-600' : 'text-brand'"
              >
                {{ props.preliminary ? t('preliminares.legend') : t('invoices.print.title') }}
              </h2>
              <template v-if="!props.preliminary">
                <p class="text-sm font-semibold text-gray-800">{{ props.invoice.number }}</p>
                <p v-if="props.invoice.numeroControl" class="text-xs text-gray-500">
                  {{ t('invoices.print.controlNumber') }}: {{ props.invoice.numeroControl }}
                </p>
              </template>
              <p class="text-xs text-gray-500">
                {{ props.invoice.issuedAt }}
                <span v-if="props.invoice.issuedTime">· {{ t('invoices.print.time') }}: {{ props.invoice.issuedTime }}</span>
              </p>
              <p v-if="props.invoice.issuedByName" class="text-xs text-gray-500">
                {{ t('invoices.print.issuedBy') }}: {{ props.invoice.issuedByName }}
              </p>
              <p v-if="props.invoice.priceListLabel" class="text-xs text-gray-500">
                {{ props.invoice.priceListLabel }}
              </p>
            </div>
          </header>

          <div
            v-if="props.invoice.status === 'VOIDED'"
            class="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3"
          >
            <p class="text-sm font-bold uppercase tracking-wide text-red-700">
              {{ t('invoices.print.voided') }}
            </p>
            <p v-if="props.invoice.voidReason" class="mt-1 text-sm text-red-700">
              {{ t('invoices.print.voidReason') }}: {{ props.invoice.voidReason }}
            </p>
          </div>

          <section class="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
                {{ t('invoices.print.customer') }}
              </p>
              <p class="font-semibold text-gray-800">{{ props.invoice.customerName }}</p>
              <p class="text-xs text-gray-500">{{ props.invoice.customerDocument }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
                {{ t('invoices.print.paymentCondition') }}
              </p>
              <p class="font-semibold text-gray-800">
                {{
                  props.invoice.paymentCondition === 'CASH'
                    ? t('invoices.print.cash')
                    : t('invoices.print.credit')
                }}
              </p>
              <p class="text-xs text-gray-500">
                {{ t('invoices.print.rate') }}:
                {{ props.invoice.exchangeRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) }}
                Bs. / 1 {{ props.invoice.currencyCode }}
              </p>
            </div>
          </section>

          <table class="mb-6 w-full text-sm">
            <thead>
              <tr class="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="py-2">{{ t('invoices.print.product') }}</th>
                <th class="py-2 text-right">{{ t('invoices.print.quantity') }}</th>
                <th class="py-2 text-right">{{ t('invoices.print.unitPrice') }}</th>
                <th class="py-2 text-right">{{ t('invoices.print.lineSubtotal') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in props.invoice.details" :key="item.productId" class="border-b border-gray-100">
                <td class="py-2 text-gray-800">{{ item.name }}</td>
                <td class="py-2 text-right text-gray-600">{{ item.quantity }}</td>
                <td class="py-2 text-right text-gray-600">
                  {{ formatMoney(item.unitPrice, props.invoice.currencyCode) }}
                </td>
                <td class="py-2 text-right font-medium text-gray-800">
                  {{ formatMoney(item.subtotal, props.invoice.currencyCode) }}
                </td>
              </tr>
            </tbody>
          </table>

          <section class="mb-6 flex justify-end">
            <div class="w-56 space-y-1 text-sm">
              <div class="flex justify-between text-gray-600">
                <span>{{ t('invoices.print.subtotal') }}</span>
                <span>{{ formatMoney(grossSubtotal, props.invoice.currencyCode) }}</span>
              </div>
              <div v-if="props.invoice.discountAmount && props.invoice.discountAmount > 0" class="flex justify-between text-gray-600">
                <span>{{ t('invoices.print.discount') }}</span>
                <span>-{{ formatMoney(props.invoice.discountAmount, props.invoice.currencyCode) }}</span>
              </div>
              <div class="flex justify-between text-gray-600">
                <span>{{ t('invoices.print.tax') }}</span>
                <span>{{ formatMoney(props.invoice.taxAmount, props.invoice.currencyCode) }}</span>
              </div>
              <div v-if="props.invoice.igtfAmount > 0" class="flex justify-between text-gray-600">
                <span>{{ t('invoices.print.igtf') }}</span>
                <span>{{ formatMoney(props.invoice.igtfAmount, props.invoice.currencyCode) }}</span>
              </div>
              <div class="flex justify-between border-t border-gray-300 pt-1 text-base font-bold text-gray-900">
                <span>{{ t('invoices.print.total') }}</span>
                <span>{{ formatMoney(props.invoice.total, props.invoice.currencyCode) }}</span>
              </div>
            </div>
          </section>

          <section v-if="!props.preliminary && props.invoice.payments.length > 0" class="mb-6">
            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              {{ t('invoices.print.payments') }}
            </p>
            <ul class="space-y-1 text-sm text-gray-600">
              <li v-for="(payment, index) in props.invoice.payments" :key="index" class="flex justify-between gap-4">
                <span>
                  {{ paymentMethodLabel(payment.method) }} ({{ payment.currencyCode }})
                  <span v-if="bankAccountLabel(payment)" class="text-xs text-gray-400">
                    — {{ bankAccountLabel(payment) }}
                  </span>
                </span>
                <span class="shrink-0">{{ formatMoney(payment.amount, payment.currencyCode) }}</span>
              </li>
            </ul>
          </section>

          <section v-if="props.invoice.notes" class="border-t border-gray-200 pt-4 text-xs text-gray-500">
            <p class="font-medium uppercase tracking-wide text-gray-400">{{ t('invoices.print.notes') }}</p>
            <p class="mt-1">{{ props.invoice.notes }}</p>
          </section>

          <p
            v-if="props.preliminary"
            class="mt-6 border-t border-amber-200 pt-4 text-xs font-medium text-amber-700"
          >
            {{ t('preliminares.printNote') }}
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
@media print {
  /* Media carta (Statement, 5.5in x 8.5in): the paper actually loaded in
     the printer for invoices, not full Letter. */
  @page {
    size: 5.5in 8.5in;
    margin: 10mm 8mm;
  }

  body * {
    visibility: hidden;
  }

  .invoice-print-overlay,
  .invoice-print-overlay * {
    visibility: visible;
  }

  .invoice-print-overlay {
    position: absolute;
    inset: 0;
    background: white;
    padding: 0;
  }

  /* The on-screen modal caps the sheet at max-w-3xl (48rem) to look right
     in a browser window; on media carta that's wider than the page itself. */
  .invoice-print-overlay > div {
    max-width: none;
    width: 100%;
  }

  .invoice-print-sheet {
    box-shadow: none;
    border-radius: 0;
    padding: 0;
  }
}
</style>
