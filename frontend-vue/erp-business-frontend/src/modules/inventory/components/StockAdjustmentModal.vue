<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

import SpinnerIcon from '@/components/ui/SpinnerIcon.vue';

interface StockAdjustmentModalProps {
  open: boolean;
  productName: string;
  productCode: string;
  warehouseName: string;
  currentQuantity: number;
  permiteDecimales: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
}

const props = defineProps<StockAdjustmentModalProps>();

const emit = defineEmits<{
  submit: [payload: { quantity: number; reason: string }];
  cancel: [];
}>();

const { t } = useI18n();

// Reset whenever the modal opens for a (possibly different) row — reactive
// object keyed off props.open via the parent re-mounting isn't guaranteed,
// so this is seeded directly from currentQuantity each time.
const form = reactive({
  quantity: props.currentQuantity,
  reason: '',
});

const canSubmit = computed<boolean>(
  () => form.reason.trim() !== '' && form.quantity !== props.currentQuantity,
);

function handleSubmit(): void {
  if (!canSubmit.value) {
    return;
  }
  const quantity = props.permiteDecimales ? form.quantity : Math.round(form.quantity);
  emit('submit', { quantity, reason: form.reason.trim() });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4"
      @click.self="emit('cancel')"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="text-lg font-bold text-gray-800">{{ t('inventory.control.adjustment.title') }}</h2>
        <p class="mt-1 text-sm text-gray-600">{{ props.productName }} ({{ props.productCode }})</p>
        <p class="text-xs text-gray-400">{{ props.warehouseName }}</p>

        <div class="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {{ t('inventory.control.adjustment.currentQuantity') }}:
          <span class="font-semibold text-gray-800">{{ props.currentQuantity }}</span>
        </div>

        <label for="adjustment-quantity" class="mb-1 mt-4 block text-xs font-medium text-gray-500">
          {{ t('inventory.control.adjustment.newQuantity') }}
        </label>
        <input
          id="adjustment-quantity"
          v-model.number="form.quantity"
          type="number"
          min="0"
          :step="props.permiteDecimales ? '0.01' : '1'"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        />

        <label for="adjustment-reason" class="mb-1 mt-4 block text-xs font-medium text-gray-500">
          {{ t('inventory.control.adjustment.reason') }}
        </label>
        <textarea
          id="adjustment-reason"
          v-model="form.reason"
          rows="3"
          required
          :placeholder="t('inventory.control.adjustment.reasonPlaceholder')"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        />
        <p v-if="form.reason.trim() === ''" class="mt-1 text-xs text-amber-600">
          {{ t('inventory.control.adjustment.reasonRequired') }}
        </p>

        <p
          v-if="errorMessage"
          class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {{ errorMessage }}
        </p>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            :disabled="props.isSaving"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            @click="emit('cancel')"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="!canSubmit || props.isSaving"
            class="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-gray-300"
            @click="handleSubmit"
          >
            <SpinnerIcon v-if="props.isSaving" />
            {{ props.isSaving ? t('inventory.control.adjustment.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
