<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface SearchInputProps {
  id: string;
  modelValue: string;
  placeholder?: string;
}

const props = defineProps<SearchInputProps>();

defineEmits<{
  'update:modelValue': [value: string];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <label :for="id" class="sr-only">{{ t('common.search') }}</label>
    <input
      :id="id"
      type="text"
      :value="modelValue"
      :placeholder="props.placeholder ?? t('common.search')"
      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 sm:w-72"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
