<script setup lang="ts">
interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: 'brand' | 'danger' | 'warning' | 'success';
}

const props = withDefaults(defineProps<KpiCardProps>(), {
  hint: undefined,
  accent: 'brand',
});

const ACCENT_BORDER: Record<NonNullable<KpiCardProps['accent']>, string> = {
  brand: '',
  danger: 'border-l-4 border-l-red-500',
  warning: 'border-l-4 border-l-warning',
  success: 'border-l-4 border-l-emerald-500',
};

const HINT_COLOR: Record<NonNullable<KpiCardProps['accent']>, string> = {
  brand: 'text-gray-400',
  danger: 'text-red-600',
  warning: 'text-warning',
  success: 'text-emerald-600',
};
</script>

<template>
  <div
    :class="[
      'rounded-xl border border-gray-200 bg-white p-5 shadow-sm',
      ACCENT_BORDER[props.accent],
    ]"
  >
    <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">{{ props.label }}</p>
    <p class="mt-2 text-2xl font-bold text-gray-800">{{ props.value }}</p>
    <p v-if="props.hint" :class="['mt-2 text-xs font-medium', HINT_COLOR[props.accent]]">
      {{ props.hint }}
    </p>
  </div>
</template>
