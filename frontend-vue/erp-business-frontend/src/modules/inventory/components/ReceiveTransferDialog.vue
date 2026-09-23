<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { StockTransfer } from '../interfaces/transfer.interface';
import { useProductStore } from '../interfaces/product.store';

const props = defineProps<{
  transfer: StockTransfer | null;
}>();

const emit = defineEmits<{
  confirm: [receivedItems: { productId: string; receivedQuantity: number }[], notes: string];
  cancel: [];
}>();

const { t } = useI18n();
const productStore = useProductStore();

const receivedQuantities = reactive<Record<string, number>>({});
const notes = reactive<{ value: string }>({ value: '' });

// Re-seed the editable quantities every time a different transfer opens.
watch(
  () => props.transfer,
  (transfer) => {
    if (!transfer) {
      return;
    }
    for (const item of transfer.items) {
      receivedQuantities[item.productId] = item.quantity;
    }
    notes.value = '';
  },
  { immediate: true },
);

function productName(productId: string): string {
  const product = productStore.getProductById(productId);
  return product ? `${product.codigo} — ${product.nombre}` : productId;
}

function handleConfirm(): void {
  if (!props.transfer) {
    return;
  }

  const receivedItems = props.transfer.items.map((item) => ({
    productId: item.productId,
    receivedQuantity: receivedQuantities[item.productId] ?? 0,
  }));

  emit('confirm', receivedItems, notes.value);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="transfer"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4"
      @click.self="emit('cancel')"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="text-lg font-bold text-gray-800">
          {{ t('inventory.transfers.receiveDialog.title', { code: transfer.code }) }}
        </h2>

        <div class="mt-4 flex flex-col gap-3">
          <div
            v-for="item in transfer.items"
            :key="item.productId"
            class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
          >
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-800">{{ productName(item.productId) }}</p>
              <p class="text-xs text-gray-400">
                {{ t('inventory.transfers.receiveDialog.requested', { quantity: item.quantity }) }}
              </p>
            </div>
            <label :for="`received-${item.productId}`" class="sr-only">
              {{ t('inventory.transfers.receiveDialog.receivedQuantity') }}
            </label>
            <input
              :id="`received-${item.productId}`"
              v-model.number="receivedQuantities[item.productId]"
              type="number"
              min="0"
              :max="item.quantity"
              class="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
          </div>
        </div>

        <div class="mt-4">
          <label for="receptionNotes" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('inventory.transfers.receiveDialog.notes') }}
          </label>
          <textarea
            id="receptionNotes"
            v-model="notes.value"
            rows="2"
            :placeholder="t('inventory.transfers.receiveDialog.notesPlaceholder')"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            @click="emit('cancel')"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
            @click="handleConfirm"
          >
            {{ t('inventory.transfers.receiveDialog.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
