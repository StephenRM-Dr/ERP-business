<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useCustomerStore } from '@/modules/customers/interfaces/customer.store';
import { useProductStore } from '@/modules/inventory/interfaces/product.store';
import type { Invoice, InvoicePayment } from '@/modules/invoices/interfaces/invoice.interface';
import { useInvoicesStore } from '@/modules/invoices/invoices.store';
import { useCompanyInfo } from '@/composables/useCompanyInfo';
import { resolveApiErrorMessage } from '@/utils/api-error';
import { formatMoney, roundCurrency } from '@/utils/money';
import ReturnPrintPreview from '../components/ReturnPrintPreview.vue';
import { useReturnsStore } from '../returns.store';
import type { CreateReturnPayload, InvoiceReturn, ReturnItem } from '../interfaces/return.interface';

const { t } = useI18n();
const route = useRoute();
const invoicesStore = useInvoicesStore();
const returnsStore = useReturnsStore();
const { ensureLoaded: ensureCompanyLoaded, companyFor } = useCompanyInfo();
const customerStore = useCustomerStore();
const currenciesStore = useCurrenciesStore();
const productStore = useProductStore();

onMounted(async () => {
  ensureCompanyLoaded();
  await Promise.all([
    customerStore.customerList.length === 0 ? customerStore.fetchCustomers() : Promise.resolve(),
    currenciesStore.currencies.length === 0 ? currenciesStore.fetchCurrencies() : Promise.resolve(),
    productStore.productList.length === 0 ? productStore.fetchProducts() : Promise.resolve(),
  ]);
  if (!invoicesStore.isLoaded) {
    invoicesStore.fetchInvoices();
  }
});

// La nota de crédito hereda el membrete de la factura que devuelve.
const companyInfo = computed(() => companyFor(selectedInvoice.value?.sucursalId ?? null));

const searchTerm = ref<string>('');
const selectedInvoice = ref<Invoice | null>(null);
// Units to return per product of the selected invoice.
const returnQuantities = ref<Record<string, number>>({});
const returnReason = ref<string>('');
const isConfirmOpen = ref<boolean>(false);
const feedbackMessage = ref<string>('');
const submitError = ref<string>('');
const isSubmitting = ref<boolean>(false);
const issuedReturn = ref<InvoiceReturn | null>(null);

const PAYMENT_METHOD_LABEL_KEYS: Record<InvoicePayment['method'], string> = {
  CASH: 'invoices.payments.methods.cash',
  CARD: 'invoices.payments.methods.card',
  TRANSFER: 'invoices.payments.methods.transfer',
  MOBILE_PAYMENT: 'invoices.payments.methods.mobilePayment',
  ANTICIPO: 'invoices.payments.methods.anticipo',
};

// Only issued (or partially returned) invoices can be called for a return.
const eligibleInvoices = computed<Invoice[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();

  return invoicesStore.sortedInvoices.filter(
    (invoice) =>
      (invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_RETURNED') &&
      (term === '' ||
        invoice.number.toLowerCase().includes(term) ||
        invoice.customerName.toLowerCase().includes(term)),
  );
});

function remainingFor(productId: string, purchasedQuantity: number): number {
  if (!selectedInvoice.value) {
    return 0;
  }

  return Math.max(
    0,
    purchasedQuantity - returnsStore.getReturnedQuantity(selectedInvoice.value.id, productId),
  );
}

function selectInvoice(invoice: Invoice): void {
  selectedInvoice.value = invoice;
  returnQuantities.value = Object.fromEntries(
    invoice.details.map((detail) => [detail.productId, 0]),
  );
  returnReason.value = '';
  searchTerm.value = '';
  feedbackMessage.value = '';
}

function clearSelection(): void {
  selectedInvoice.value = null;
  returnQuantities.value = {};
  returnReason.value = '';
}

function fillTotalReturn(): void {
  if (!selectedInvoice.value) {
    return;
  }

  for (const detail of selectedInvoice.value.details) {
    returnQuantities.value[detail.productId] = remainingFor(detail.productId, detail.quantity);
  }
}

function clearQuantities(): void {
  for (const productId of Object.keys(returnQuantities.value)) {
    returnQuantities.value[productId] = 0;
  }
}

function handleQuantityInput(productId: string, purchasedQuantity: number, event: Event): void {
  const input = event.target as HTMLInputElement;
  const requested = Math.trunc(Number(input.value));
  const clamped = Math.min(
    Math.max(Number.isFinite(requested) ? requested : 0, 0),
    remainingFor(productId, purchasedQuantity),
  );

  returnQuantities.value[productId] = clamped;
  input.value = String(clamped);
}

const selectedItems = computed<ReturnItem[]>(() => {
  if (!selectedInvoice.value) {
    return [];
  }

  return selectedInvoice.value.details
    .filter((detail) => (returnQuantities.value[detail.productId] ?? 0) > 0)
    .map((detail) => {
      const quantity = returnQuantities.value[detail.productId] ?? 0;
      return {
        productId: detail.productId,
        name: detail.name,
        quantity,
        unitPrice: detail.unitPrice,
        subtotal: roundCurrency(quantity * detail.unitPrice),
        facturaItemId: detail.facturaItemId,
      };
    });
});

const itemsSubtotal = computed<number>(() =>
  roundCurrency(selectedItems.value.reduce((sum, item) => sum + item.subtotal, 0)),
);

// Refund includes the proportional share of VAT/IGTF: the invoice's own
// total-to-subtotal ratio scales each returned unit's price to what the
// customer actually paid for it. The backend recomputes this for the credit note.
const refundTotal = computed<number>(() => {
  if (!selectedInvoice.value || selectedInvoice.value.subtotal === 0) {
    return 0;
  }

  const ratio = selectedInvoice.value.total / selectedInvoice.value.subtotal;
  return roundCurrency(itemsSubtotal.value * ratio);
});

// TOTAL only when this single return covers every purchased unit of the
// invoice; anything else (including completing earlier partials) is PARTIAL.
const returnType = computed<CreateReturnPayload['type']>(() => {
  if (!selectedInvoice.value) {
    return 'PARTIAL';
  }

  const coversEverything = selectedInvoice.value.details.every(
    (detail) => (returnQuantities.value[detail.productId] ?? 0) === detail.quantity,
  );

  return coversEverything ? 'TOTAL' : 'PARTIAL';
});

const canSubmit = computed<boolean>(
  () =>
    selectedInvoice.value !== null &&
    selectedItems.value.length > 0 &&
    returnReason.value.trim() !== '',
);

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value || !selectedInvoice.value || isSubmitting.value) {
    return;
  }

  const payload: CreateReturnPayload = {
    invoiceId: selectedInvoice.value.id,
    invoiceNumber: selectedInvoice.value.number,
    type: returnType.value,
    items: selectedItems.value,
    itemsSubtotal: itemsSubtotal.value,
    refundTotal: refundTotal.value,
    currencyCode: selectedInvoice.value.currencyCode,
    reason: returnReason.value.trim(),
  };

  submitError.value = '';
  isSubmitting.value = true;

  try {
    const invoiceReturn = await returnsStore.registerReturn(
      payload,
      selectedInvoice.value.customerName,
      selectedInvoice.value.customerDocument,
    );

    isConfirmOpen.value = false;
    feedbackMessage.value = t('returns.registered', { number: invoiceReturn.number });
    issuedReturn.value = invoiceReturn;
    clearSelection();
  } catch (err) {
    submitError.value = resolveApiErrorMessage(err, t('returns.submitError'));
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => {
  // Deep link from the invoice list: /returns/create?invoice=<id>
  const invoiceId = route.query.invoice;

  if (typeof invoiceId === 'string') {
    const invoice = invoicesStore.invoices.find((item) => item.id === invoiceId);

    if (invoice && (invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_RETURNED')) {
      selectInvoice(invoice);
    }
  }
});
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-800">{{ t('returns.title') }}</h1>
    <p class="mb-6 text-sm text-gray-500">{{ t('returns.description') }}</p>

    <p
      v-if="feedbackMessage"
      class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700"
    >
      {{ feedbackMessage }}
    </p>

    <!-- Step 1: call the invoice -->
    <div v-if="!selectedInvoice" class="relative max-w-2xl">
      <label for="return-invoice-search" class="sr-only">
        {{ t('returns.searchPlaceholder') }}
      </label>
      <input
        id="return-invoice-search"
        v-model="searchTerm"
        type="text"
        :placeholder="t('returns.searchPlaceholder')"
        class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
      />

      <ul class="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
        <li
          v-for="invoice in eligibleInvoices"
          :key="invoice.id"
          class="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-brand/10"
          @click="selectInvoice(invoice)"
        >
          <div>
            <p class="font-mono text-sm font-semibold text-gray-800">{{ invoice.number }}</p>
            <p class="text-xs text-gray-500">{{ invoice.customerName }} · {{ invoice.issuedAt }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span
              v-if="invoice.status === 'PARTIALLY_RETURNED'"
              class="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700"
            >
              {{ t('invoices.status.partially_returned') }}
            </span>
            <span class="text-sm font-semibold text-gray-800">
              {{ formatMoney(invoice.total, invoice.currencyCode) }}
            </span>
          </div>
        </li>

        <li v-if="eligibleInvoices.length === 0" class="px-4 py-6 text-center text-sm text-gray-400">
          {{ t('returns.noEligible') }}
        </li>
      </ul>
    </div>

    <!-- Step 2: invoice loaded -->
    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section class="space-y-6 lg:col-span-2">
        <!-- Invoice header -->
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p class="font-mono text-lg font-bold text-gray-800">{{ selectedInvoice.number }}</p>
            <p class="text-xs text-gray-500">
              {{ selectedInvoice.customerName }} · {{ selectedInvoice.issuedAt }} ·
              {{ t(`invoices.payment.${selectedInvoice.paymentCondition === 'CASH' ? 'cash' : 'credit'}`) }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold text-gray-600">
              {{ selectedInvoice.currencyCode }}
            </span>
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
              @click="clearSelection"
            >
              {{ t('returns.changeInvoice') }}
            </button>
          </div>
        </div>

        <!-- Items to return -->
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-600">
              {{ t('returns.items') }}
            </h2>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-light"
                @click="fillTotalReturn"
              >
                {{ t('returns.totalReturn') }}
              </button>
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                @click="clearQuantities"
              >
                {{ t('returns.clear') }}
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th class="px-5 py-3 font-medium">{{ t('invoices.productName') }}</th>
                  <th class="px-5 py-3 text-center font-medium">{{ t('returns.purchased') }}</th>
                  <th class="px-5 py-3 text-center font-medium">{{ t('returns.alreadyReturned') }}</th>
                  <th class="px-5 py-3 text-center font-medium">{{ t('returns.toReturn') }}</th>
                  <th class="px-5 py-3 text-right font-medium">{{ t('invoices.cart.unitPrice') }}</th>
                  <th class="px-5 py-3 text-right font-medium">{{ t('returns.refund') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="detail in selectedInvoice.details"
                  :key="detail.productId"
                  class="border-t border-gray-100"
                >
                  <td class="px-5 py-3 font-medium text-gray-800">{{ detail.name }}</td>
                  <td class="px-5 py-3 text-center text-gray-600">{{ detail.quantity }}</td>
                  <td class="px-5 py-3 text-center text-gray-400">
                    {{ returnsStore.getReturnedQuantity(selectedInvoice.id, detail.productId) }}
                  </td>
                  <td class="px-5 py-3 text-center">
                    <input
                      :id="`return-qty-${detail.productId}`"
                      type="number"
                      min="0"
                      :max="remainingFor(detail.productId, detail.quantity)"
                      :value="returnQuantities[detail.productId] ?? 0"
                      :disabled="remainingFor(detail.productId, detail.quantity) === 0"
                      :aria-label="`${t('returns.toReturn')} - ${detail.name}`"
                      class="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-center text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:bg-gray-50 disabled:text-gray-300"
                      @change="handleQuantityInput(detail.productId, detail.quantity, $event)"
                    />
                  </td>
                  <td class="px-5 py-3 text-right text-gray-600">
                    {{ formatMoney(detail.unitPrice, selectedInvoice.currencyCode) }}
                  </td>
                  <td class="px-5 py-3 text-right font-semibold text-gray-800">
                    {{
                      formatMoney(
                        (returnQuantities[detail.productId] ?? 0) * detail.unitPrice,
                        selectedInvoice.currencyCode,
                      )
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Summary -->
      <aside class="space-y-6">
        <!-- Original payments (reference) -->
        <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
            {{ t('returns.originalPayments') }}
          </h2>
          <ul v-if="selectedInvoice.payments.length > 0" class="space-y-2 text-sm">
            <li
              v-for="(payment, index) in selectedInvoice.payments"
              :key="index"
              class="flex items-center justify-between"
            >
              <span class="text-gray-600">
                {{ t(PAYMENT_METHOD_LABEL_KEYS[payment.method]) }}
                <span class="ml-1 rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500">
                  {{ payment.currencyCode }}
                </span>
              </span>
              <span class="font-semibold text-gray-800">
                {{ formatMoney(payment.amount, payment.currencyCode) }}
              </span>
            </li>
          </ul>
          <p v-else class="text-sm text-gray-400">{{ t('returns.creditNoPayments') }}</p>
        </div>

        <!-- Refund summary -->
        <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <dl class="space-y-3 text-sm">
            <div class="flex items-center justify-between text-gray-600">
              <dt>{{ t('returns.type') }}</dt>
              <dd>
                <span
                  :class="[
                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                    returnType === 'TOTAL'
                      ? 'bg-brand/10 text-brand-hover'
                      : 'bg-sky-50 text-sky-700',
                  ]"
                >
                  {{ returnType === 'TOTAL' ? t('returns.typeTotal') : t('returns.typePartial') }}
                </span>
              </dd>
            </div>
            <div class="flex items-center justify-between text-gray-600">
              <dt>{{ t('returns.itemsSubtotal') }}</dt>
              <dd>{{ formatMoney(itemsSubtotal, selectedInvoice.currencyCode) }}</dd>
            </div>
            <div
              class="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-900"
            >
              <dt>{{ t('returns.refundTotal') }}</dt>
              <dd>{{ formatMoney(refundTotal, selectedInvoice.currencyCode) }}</dd>
            </div>
          </dl>

          <p class="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {{ t('returns.refundNote') }}
          </p>

          <label for="return-reason" class="mb-1 mt-4 block text-xs font-medium text-gray-500">
            {{ t('returns.reason') }}
          </label>
          <textarea
            id="return-reason"
            v-model="returnReason"
            rows="2"
            :placeholder="t('returns.reasonPlaceholder')"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
          <p v-if="returnReason.trim() === ''" class="mt-1 text-xs text-amber-600">
            {{ t('returns.reasonRequired') }}
          </p>

          <button
            type="button"
            :disabled="!canSubmit"
            class="mt-4 w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-gray-300"
            @click="isConfirmOpen = true"
          >
            {{ t('returns.submit') }}
          </button>
        </div>
      </aside>
    </div>

    <ConfirmDialog
      :open="isConfirmOpen"
      :title="t('returns.confirmTitle')"
      :message="
        t('returns.confirmMessage', {
          number: selectedInvoice?.number ?? '',
          refund: formatMoney(refundTotal, selectedInvoice?.currencyCode ?? 'VES'),
        })
      "
      :confirm-label="isSubmitting ? t('returns.submitting') : t('returns.submit')"
      :confirm-disabled="isSubmitting"
      @confirm="handleSubmit"
      @cancel="isConfirmOpen = false"
    >
      <p v-if="submitError" class="mt-3 text-sm text-red-600">{{ submitError }}</p>
    </ConfirmDialog>

    <ReturnPrintPreview
      v-if="issuedReturn"
      :invoice-return="issuedReturn"
      :company="companyInfo"
      @close="issuedReturn = null"
    />
  </div>
</template>
