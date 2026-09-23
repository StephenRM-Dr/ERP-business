<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import StockAdjustmentPrintPreview from './StockAdjustmentPrintPreview.vue';
import type { StockAdjustmentResult, StockMovement } from '../interfaces/stock.interface';
import { useStockStore } from '../interfaces/stock.store';

const props = defineProps<{
  stockId: string | null;
  productName: string;
  productCode: string;
  warehouseName: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const stockStore = useStockStore();

onMounted(() => {
  if (props.stockId) {
    stockStore.fetchMovements(props.stockId);
  }
});

const movementToPrint = ref<StockAdjustmentResult | null>(null);

// Only manual adjustments (CARGO/DESCARGO from the adjustment modal) carry a
// before/after snapshot — transfers use the same ledger but not these fields.
function canReprint(movement: StockMovement): boolean {
  return movement.quantityBefore !== null && movement.quantityAfter !== null;
}

function reprint(movement: StockMovement): void {
  if (!canReprint(movement)) {
    return;
  }
  movementToPrint.value = {
    documentNumber: movement.documentNumber,
    reason: movement.reason,
    quantityBefore: movement.quantityBefore as number,
    quantityAfter: movement.quantityAfter as number,
  };
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' });
}

const TYPE_STYLES: Record<string, string> = {
  CARGO: 'text-emerald-600',
  DESCARGO: 'text-red-600',
  TRANSFERENCIA: 'text-blue-600',
};

function typeLabel(type: string): string {
  return t(`inventory.control.history.type.${type}`);
}

function signedQuantity(movement: { type: string; quantity: number }): string {
  return movement.type === 'DESCARGO' ? `-${movement.quantity}` : `+${movement.quantity}`;
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="stockId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4"
      @click.self="emit('close')"
    >
      <div class="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="text-lg font-bold text-gray-800">
          {{ t('inventory.control.history.title', { name: productName }) }}
        </h2>

        <p v-if="stockStore.isLoadingMovements" class="mt-6 text-center text-sm text-gray-400">
          {{ t('inventory.control.history.loading') }}
        </p>
        <p v-else-if="stockStore.movements.length === 0" class="mt-6 text-center text-sm text-gray-400">
          {{ t('inventory.control.history.empty') }}
        </p>
        <ul v-else class="mt-4 divide-y divide-gray-100">
          <li v-for="movement in stockStore.movements" :key="movement.id" class="py-3 text-sm">
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium" :class="TYPE_STYLES[movement.type]">
                {{ typeLabel(movement.type) }} ({{ signedQuantity(movement) }})
              </span>
              <span class="text-xs text-gray-400">{{ formatDate(movement.createdAt) }}</span>
            </div>
            <p v-if="movement.documentNumber" class="mt-1 font-mono text-xs text-gray-400">
              {{ movement.documentNumber }}
            </p>
            <p v-if="movement.userName" class="mt-1 text-xs text-gray-500">
              {{ t('inventory.control.history.by', { name: movement.userName }) }}
            </p>
            <p v-if="movement.reason" class="mt-1 text-gray-600">{{ movement.reason }}</p>
            <button
              v-if="canReprint(movement)"
              type="button"
              class="mt-1 text-xs font-medium text-brand hover:underline"
              @click="reprint(movement)"
            >
              {{ t('inventory.control.adjustment.reprint') }}
            </button>
          </li>
        </ul>

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

    <StockAdjustmentPrintPreview
      v-if="movementToPrint"
      :adjustment="movementToPrint"
      :product-name="productName"
      :product-code="productCode"
      :warehouse-name="warehouseName"
      @close="movementToPrint = null"
    />
  </Teleport>
</template>
