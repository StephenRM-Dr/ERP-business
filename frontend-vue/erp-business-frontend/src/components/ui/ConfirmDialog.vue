<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import SpinnerIcon from './SpinnerIcon.vue';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Disables both buttons and shows confirmLabel as-is (caller passes a "processing..." label) while an async confirm is in flight. */
  confirmDisabled?: boolean;
}

const props = defineProps<ConfirmDialogProps>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const { t } = useI18n();
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4"
      @click.self="emit('cancel')"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="text-lg font-bold text-gray-800">{{ props.title }}</h2>
        <p class="mt-2 text-sm text-gray-600">{{ props.message }}</p>

        <slot />

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            :disabled="props.confirmDisabled"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            @click="emit('cancel')"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="props.confirmDisabled"
            :class="[
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300',
              props.destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-brand hover:bg-brand-hover',
            ]"
            @click="emit('confirm')"
          >
            <SpinnerIcon v-if="props.confirmDisabled" size-class="h-4 w-4" />
            {{ props.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
