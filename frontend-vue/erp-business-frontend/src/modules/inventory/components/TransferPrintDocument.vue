<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { TRANSFER_CATEGORY_RULES, type StockTransfer } from '../interfaces/transfer.interface';
import { useProductStore } from '../interfaces/product.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';

interface CompanyInfo {
  nombre: string;
  rif: string;
  direccionFiscal: string;
  telefono: string;
  email: string;
}

interface TransferPrintDocumentProps {
  transfer: StockTransfer;
  company: CompanyInfo | null;
  /**
   * Modo preliminar: la transferencia todavía no se emitió, así que no hay
   * código de documento ni estado que mostrar — solo la leyenda PRELIMINAR.
   */
  preliminary?: boolean;
}

const props = defineProps<TransferPrintDocumentProps>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();

const rules = computed(() => TRANSFER_CATEGORY_RULES[props.transfer.category]);

function warehouseName(warehouseId: string | null): string {
  if (!warehouseId) {
    return '—';
  }
  return warehouseStore.getWarehouseById(warehouseId)?.name ?? '—';
}

function productLabel(productId: string): { sku: string; name: string } {
  const product = productStore.getProductById(productId);
  return { sku: product?.codigo ?? '', name: product?.nombre ?? productId };
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' });
}

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
            </div>
            <div class="text-right">
              <h2
                class="text-base font-bold uppercase tracking-wide"
                :class="props.preliminary ? 'text-amber-600' : 'text-brand'"
              >
                {{
                  props.preliminary
                    ? t('preliminares.legend')
                    : t(`inventory.transfers.print.title.${props.transfer.category}`)
                }}
              </h2>
              <p v-if="props.preliminary" class="text-xs text-gray-500">
                {{ t(`inventory.transfers.print.title.${props.transfer.category}`) }}
              </p>
              <p v-else class="text-sm font-semibold text-gray-800">{{ props.transfer.code }}</p>
              <p class="text-xs text-gray-500">{{ formatDate(props.transfer.createdAt) }}</p>
            </div>
          </header>

          <section class="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div v-if="rules.requiresOrigin">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
                {{ t('inventory.transfers.form.from') }}
              </p>
              <p class="font-semibold text-gray-800">{{ warehouseName(props.transfer.fromWarehouseId) }}</p>
            </div>
            <div v-if="rules.requiresDestination">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
                {{ t('inventory.transfers.form.to') }}
              </p>
              <p class="font-semibold text-gray-800">{{ warehouseName(props.transfer.toWarehouseId) }}</p>
            </div>
            <div v-if="!props.preliminary">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
                {{ t('common.status') }}
              </p>
              <p class="font-semibold text-gray-800">
                {{ t(`inventory.transfers.status.${props.transfer.status}`) }}
              </p>
            </div>
          </section>

          <table class="mb-6 w-full text-sm">
            <thead>
              <tr class="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="py-2">{{ t('inventory.products.form.codigo') }}</th>
                <th class="py-2">{{ t('inventory.products.form.name') }}</th>
                <th class="py-2 text-right">{{ t('inventory.transfers.detail.requestedHeader') }}</th>
                <th v-if="props.transfer.status !== 'REQUESTED'" class="py-2 text-right">
                  {{ t('inventory.transfers.detail.receivedHeader') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in props.transfer.items" :key="item.productId" class="border-b border-gray-100">
                <td class="py-2 font-mono text-gray-600">{{ productLabel(item.productId).sku }}</td>
                <td class="py-2 text-gray-800">{{ productLabel(item.productId).name }}</td>
                <td class="py-2 text-right text-gray-600">{{ item.quantity }}</td>
                <td v-if="props.transfer.status !== 'REQUESTED'" class="py-2 text-right text-gray-600">
                  {{ item.receivedQuantity ?? '—' }}
                </td>
              </tr>
            </tbody>
          </table>

          <section v-if="props.transfer.notes" class="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {{ t('inventory.transfers.print.reason') }}
            </p>
            <p class="mt-1 text-sm text-amber-700">{{ props.transfer.notes }}</p>
          </section>

          <p
            v-if="props.preliminary"
            class="mt-6 border-t border-amber-200 pt-4 text-xs font-medium text-amber-700"
          >
            {{ t('preliminares.transferPrintNote') }}
          </p>

          <section v-if="!props.preliminary && props.transfer.receptionNotes" class="border-t border-gray-200 pt-4 text-xs text-gray-500">
            <p class="font-medium uppercase tracking-wide text-gray-400">
              {{ t('inventory.transfers.detail.discrepancyReport') }}
            </p>
            <p class="mt-1">{{ props.transfer.receptionNotes }}</p>
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
