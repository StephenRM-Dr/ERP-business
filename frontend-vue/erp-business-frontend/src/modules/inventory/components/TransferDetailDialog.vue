<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { StockTransfer, StockTransferItem, StockTransferStatus } from '../interfaces/transfer.interface';
import { useProductStore } from '../interfaces/product.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';

const props = defineProps<{
  transfer: StockTransfer | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();

const STATUS_STYLES: Record<StockTransferStatus, string> = {
  REQUESTED: 'bg-amber-50 text-amber-700',
  IN_TRANSIT: 'bg-blue-50 text-blue-700',
  RECEIVED_PARTIAL: 'bg-orange-50 text-orange-700',
  RECEIVED_CONFIRMED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

interface DetailRow {
  productId: string;
  sku: string;
  name: string;
  requestedQuantity: number;
  receivedQuantity?: number;
  unitCost: number;
  subtotalCost: number;
  subtotalWeightKg: number;
  hasDiscrepancy: boolean;
}

function buildRows(items: StockTransferItem[]): DetailRow[] {
  return items.map((item) => {
    const product = productStore.getProductById(item.productId);
    const unitCost = product?.precioCosto ?? 0;
    const settledQuantity = item.receivedQuantity ?? item.quantity;

    return {
      productId: item.productId,
      sku: product?.codigo ?? '',
      name: product?.nombre ?? item.productId,
      requestedQuantity: item.quantity,
      receivedQuantity: item.receivedQuantity,
      unitCost,
      subtotalCost: unitCost * settledQuantity,
      subtotalWeightKg: (product?.pesoKg ?? 0) * settledQuantity,
      hasDiscrepancy: item.receivedQuantity !== undefined && item.receivedQuantity !== item.quantity,
    };
  });
}

const rows = computed<DetailRow[]>(() => (props.transfer ? buildRows(props.transfer.items) : []));

const totalCost = computed<number>(() => rows.value.reduce((sum, row) => sum + row.subtotalCost, 0));

// Base for freight/dispatch cost estimation.
const totalWeightKg = computed<number>(() =>
  rows.value.reduce((sum, row) => sum + row.subtotalWeightKg, 0),
);

const hasDiscrepancies = computed<boolean>(() => rows.value.some((row) => row.hasDiscrepancy));

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' });
}

function warehouseName(warehouseId: string | null): string {
  if (!warehouseId) {
    return '—';
  }
  return warehouseStore.getWarehouseById(warehouseId)?.name ?? '—';
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="transfer"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4"
      @click.self="emit('close')"
    >
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-gray-800">{{ transfer.code }}</h2>
            <p class="text-sm text-gray-500">{{ t(`inventory.transfers.category.${transfer.category}`) }}</p>
          </div>
          <span :class="['rounded-full px-3 py-1 text-xs font-semibold', STATUS_STYLES[transfer.status]]">
            {{ t(`inventory.transfers.status.${transfer.status}`) }}
          </span>
        </div>

        <div class="mb-4 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
          <div>
            <p class="text-xs font-medium text-gray-400">{{ t('inventory.transfers.form.from') }}</p>
            <p class="text-gray-700">{{ warehouseName(transfer.fromWarehouseId) }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-gray-400">{{ t('inventory.transfers.form.to') }}</p>
            <p class="text-gray-700">{{ warehouseName(transfer.toWarehouseId) }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-gray-400">{{ t('inventory.transfers.detail.createdAt') }}</p>
            <p class="text-gray-700">{{ formatDate(transfer.createdAt) }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-gray-400">{{ t('inventory.transfers.detail.updatedAt') }}</p>
            <p class="text-gray-700">{{ formatDate(transfer.updatedAt) }}</p>
          </div>
        </div>

        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {{ t('inventory.transfers.form.items') }}
        </h3>
        <div class="mb-4 overflow-x-auto rounded-lg border border-gray-200">
          <table class="w-full min-w-[520px] text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="px-3 py-2 font-medium">{{ t('inventory.products.form.codigo') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('inventory.products.form.name') }}</th>
                <th class="px-3 py-2 text-right font-medium">{{ t('inventory.transfers.detail.requestedHeader') }}</th>
                <th class="px-3 py-2 text-right font-medium">{{ t('inventory.transfers.detail.receivedHeader') }}</th>
                <th class="px-3 py-2 text-right font-medium">{{ t('inventory.prices.cost') }}</th>
                <th class="px-3 py-2 text-right font-medium">{{ t('inventory.transfers.detail.subtotal') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.productId" class="border-t border-gray-100">
                <td class="px-3 py-2 font-mono text-gray-600">{{ row.sku }}</td>
                <td class="px-3 py-2 text-gray-700">{{ row.name }}</td>
                <td class="px-3 py-2 text-right text-gray-600">{{ row.requestedQuantity }}</td>
                <td
                  class="px-3 py-2 text-right"
                  :class="row.hasDiscrepancy ? 'font-semibold text-orange-600' : 'text-gray-600'"
                >
                  {{ row.receivedQuantity ?? '—' }}
                </td>
                <td class="px-3 py-2 text-right text-gray-600">{{ row.unitCost.toFixed(2) }}</td>
                <td class="px-3 py-2 text-right font-medium text-gray-800">{{ row.subtotalCost.toFixed(2) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t border-gray-200 bg-gray-50">
                <td colspan="5" class="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-500">
                  {{ t('inventory.transfers.detail.totalWeight') }}
                </td>
                <td class="px-3 py-2 text-right font-bold text-gray-800">{{ totalWeightKg.toFixed(2) }} kg</td>
              </tr>
              <tr class="border-t border-gray-200 bg-gray-50">
                <td colspan="5" class="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-500">
                  {{ t('inventory.transfers.detail.totalCost') }}
                </td>
                <td class="px-3 py-2 text-right font-bold text-gray-800">{{ totalCost.toFixed(2) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-if="hasDiscrepancies || transfer.receptionNotes" class="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
            {{ t('inventory.transfers.detail.discrepancyReport') }}
          </h3>
          <ul v-if="hasDiscrepancies" class="mb-2 list-inside list-disc text-sm text-orange-700">
            <li v-for="row in rows.filter((r) => r.hasDiscrepancy)" :key="row.productId">
              {{ row.name }}: {{ t('inventory.transfers.detail.discrepancyLine', { requested: row.requestedQuantity, received: row.receivedQuantity }) }}
            </li>
          </ul>
          <p v-if="transfer.receptionNotes" class="text-sm text-orange-700">{{ transfer.receptionNotes }}</p>
        </div>

        <div v-if="transfer.notes">
          <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {{ t('inventory.transfers.form.notes') }}
          </h3>
          <p class="text-sm text-gray-600">{{ transfer.notes }}</p>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            @click="emit('close')"
          >
            {{ t('common.close') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
