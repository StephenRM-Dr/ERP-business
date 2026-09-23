<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { formatMoney } from '@/utils/money';
import type { InvoiceReturn } from '../interfaces/return.interface';

interface CompanyInfo {
  nombre: string;
  rif: string;
  direccionFiscal: string;
  telefono: string;
  email: string;
}

interface ReturnPrintPreviewProps {
  invoiceReturn: InvoiceReturn;
  company: CompanyInfo | null;
}

const props = defineProps<ReturnPrintPreviewProps>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

function handlePrint(): void {
  window.print();
}
</script>

<template>
  <Teleport to="body">
    <div class="invoice-print-overlay fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8">
      <div class="mx-auto max-w-3xl">
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

        <div class="invoice-print-sheet rounded-xl bg-white p-8 shadow-xl">
          <header class="mb-6 flex items-start justify-between border-b border-gray-200 pb-4">
            <div>
              <h1 class="text-lg font-bold text-gray-900">{{ props.company?.nombre ?? '—' }}</h1>
              <p v-if="props.company?.rif" class="text-xs text-gray-500">RIF: {{ props.company.rif }}</p>
              <p v-if="props.company?.direccionFiscal" class="mt-1 max-w-xs text-xs text-gray-500">
                {{ props.company.direccionFiscal }}
              </p>
              <p v-if="props.company?.telefono || props.company?.email" class="text-xs text-gray-500">
                {{ [props.company?.telefono, props.company?.email].filter(Boolean).join(' · ') }}
              </p>
            </div>
            <div class="text-right">
              <h2 class="text-base font-bold uppercase tracking-wide text-brand">
                {{ t('returns.print.title') }}
              </h2>
              <p class="text-sm font-semibold text-gray-800">{{ props.invoiceReturn.number }}</p>
              <p class="text-xs text-gray-500">
                {{ t('returns.print.againstInvoice') }}: {{ props.invoiceReturn.invoiceNumber }}
              </p>
              <p class="text-xs text-gray-500">{{ props.invoiceReturn.date }}</p>
            </div>
          </header>

          <div class="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p class="text-sm font-bold uppercase tracking-wide text-amber-700">
              {{
                props.invoiceReturn.type === 'TOTAL'
                  ? t('returns.typeTotal')
                  : t('returns.typePartial')
              }}
            </p>
            <p class="mt-1 text-sm text-amber-700">
              {{ t('returns.print.reason') }}: {{ props.invoiceReturn.reason }}
            </p>
          </div>

          <section class="mb-6 text-sm">
            <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
              {{ t('invoices.print.customer') }}
            </p>
            <p class="font-semibold text-gray-800">{{ props.invoiceReturn.customerName }}</p>
            <p class="text-xs text-gray-500">{{ props.invoiceReturn.customerDocument }}</p>
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
              <tr
                v-for="item in props.invoiceReturn.items"
                :key="item.productId"
                class="border-b border-gray-100"
              >
                <td class="py-2 text-gray-800">{{ item.name }}</td>
                <td class="py-2 text-right text-gray-600">{{ item.quantity }}</td>
                <td class="py-2 text-right text-gray-600">
                  {{ formatMoney(item.unitPrice, props.invoiceReturn.currencyCode) }}
                </td>
                <td class="py-2 text-right font-medium text-gray-800">
                  {{ formatMoney(item.subtotal, props.invoiceReturn.currencyCode) }}
                </td>
              </tr>
            </tbody>
          </table>

          <section class="flex justify-end">
            <div class="w-56 space-y-1 text-sm">
              <div class="flex justify-between text-gray-600">
                <span>{{ t('invoices.print.subtotal') }}</span>
                <span>{{ formatMoney(props.invoiceReturn.itemsSubtotal, props.invoiceReturn.currencyCode) }}</span>
              </div>
              <div class="flex justify-between border-t border-gray-300 pt-1 text-base font-bold text-gray-900">
                <span>{{ t('returns.refundTotal') }}</span>
                <span>{{ formatMoney(props.invoiceReturn.refundTotal, props.invoiceReturn.currencyCode) }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
@media print {
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

  .invoice-print-sheet {
    box-shadow: none;
    border-radius: 0;
  }
}
</style>
