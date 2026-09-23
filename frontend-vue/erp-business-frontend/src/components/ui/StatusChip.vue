<script setup lang="ts">
interface StatusChipProps {
  label: string;
  tone?: 'success' | 'danger' | 'warning' | 'neutral';
}

const props = withDefaults(defineProps<StatusChipProps>(), {
  tone: 'neutral',
});

const TONE_CLASSES: Record<NonNullable<StatusChipProps['tone']>, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-warning-soft text-warning',
  neutral: 'bg-gray-100 text-gray-500',
};
</script>

<template>
  <span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', TONE_CLASSES[props.tone]]">
    {{ props.label }}
  </span>
</template>
