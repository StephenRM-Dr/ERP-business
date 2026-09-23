<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  pageSize: number;
}

const props = defineProps<PaginationBarProps>();

const emit = defineEmits<{
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

const { t } = useI18n();

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function handlePageSizeChange(event: Event): void {
  const select = event.target as HTMLSelectElement;
  emit('update:pageSize', Number(select.value));
}
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3 text-sm text-gray-600"
  >
    <p class="text-xs">
      {{ t('common.pagination.showing', { from: props.rangeStart, to: props.rangeEnd, total: props.totalItems }) }}
    </p>

    <div class="flex items-center gap-3">
      <label for="page-size" class="text-xs text-gray-500">
        {{ t('common.pagination.perPage') }}
      </label>
      <select
        id="page-size"
        :value="props.pageSize"
        class="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-brand"
        @change="handlePageSizeChange"
      >
        <option v-for="option in PAGE_SIZE_OPTIONS" :key="option" :value="option">
          {{ option }}
        </option>
      </select>

      <div class="flex items-center gap-1">
        <button
          type="button"
          :disabled="props.page <= 1"
          class="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          @click="emit('update:page', props.page - 1)"
        >
          {{ t('common.pagination.previous') }}
        </button>
        <span class="px-2 text-xs">
          {{ t('common.pagination.pageOf', { page: props.page, total: props.totalPages }) }}
        </span>
        <button
          type="button"
          :disabled="props.page >= props.totalPages"
          class="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          @click="emit('update:page', props.page + 1)"
        >
          {{ t('common.pagination.next') }}
        </button>
      </div>
    </div>
  </div>
</template>
