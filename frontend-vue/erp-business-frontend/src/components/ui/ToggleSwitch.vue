<script setup lang="ts">
interface ToggleSwitchProps {
  modelValue: boolean;
  ariaLabel: string;
  disabled?: boolean;
}

const props = defineProps<ToggleSwitchProps>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<template>
  <button
    type="button"
    :disabled="props.disabled"
    :class="[
      'relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      props.modelValue ? 'bg-emerald-500' : 'bg-gray-300',
    ]"
    :aria-label="props.ariaLabel"
    :aria-pressed="props.modelValue"
    @click="emit('update:modelValue', !props.modelValue)"
  >
    <span
      :class="[
        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
        props.modelValue ? 'left-[18px]' : 'left-0.5',
      ]"
    />
  </button>
</template>
