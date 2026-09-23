<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import type { StockAdjustmentResult } from '../interfaces/stock.interface';

interface StockAdjustmentPrintPreviewProps {
  adjustment: StockAdjustmentResult;
  productName: string;
  productCode: string;
  warehouseName: string;
}

const props = defineProps<StockAdjustmentPrintPreviewProps>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

function handlePrint(): void {
  window.print();
}

const today = new Date().toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' });
</script>

<template>
  <Teleport to="body">
    <div class="adjustment-print-overlay fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8">
      <div class="mx-auto max-w-lg">
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

        <div class="adjustment-print-sheet rounded-xl bg-white p-8 shadow-xl">
          <header class="mb-6 border-b border-gray-200 pb-4">
            <h2 class="text-base font-bold uppercase tracking-wide text-brand">
              {{ t('inventory.control.adjustment.documentTitle') }}
            </h2>
            <p class="text-sm font-semibold text-gray-800">{{ props.adjustment.documentNumber ?? '—' }}</p>
            <p class="text-xs text-gray-500">{{ today }}</p>
          </header>

          <dl class="space-y-3 text-sm">
            <div class="flex justify-between">
              <dt class="text-gray-500">{{ t('invoices.print.product') }}</dt>
              <dd class="font-medium text-gray-800">{{ props.productName }} ({{ props.productCode }})</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">{{ t('inventory.control.warehouse') }}</dt>
              <dd class="font-medium text-gray-800">{{ props.warehouseName }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">{{ t('inventory.control.adjustment.quantityBefore') }}</dt>
              <dd class="font-medium text-gray-800">{{ props.adjustment.quantityBefore }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">{{ t('inventory.control.adjustment.quantityAfter') }}</dt>
              <dd class="font-medium text-gray-800">{{ props.adjustment.quantityAfter }}</dd>
            </div>
            <div class="flex justify-between border-t border-gray-200 pt-3">
              <dt class="text-gray-500">{{ t('inventory.control.reason') }}</dt>
              <dd class="max-w-[60%] text-right font-medium text-gray-800">{{ props.adjustment.reason ?? '—' }}</dd>
            </div>
          </dl>
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

  .adjustment-print-overlay,
  .adjustment-print-overlay * {
    visibility: visible;
  }

  .adjustment-print-overlay {
    position: absolute;
    inset: 0;
    background: white;
    padding: 0;
  }

  .adjustment-print-sheet {
    box-shadow: none;
    border-radius: 0;
  }
}
</style>
