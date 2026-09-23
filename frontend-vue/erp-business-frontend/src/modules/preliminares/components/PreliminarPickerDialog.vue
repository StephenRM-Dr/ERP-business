<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { usePreliminaresStore } from '../preliminares.store';
import type { PreliminarSummary, PreliminarType } from '../interfaces/preliminar.interface';

const props = defineProps<{
  type: PreliminarType;
}>();

const emit = defineEmits<{
  close: [];
  select: [preliminar: PreliminarSummary];
}>();

const { t } = useI18n();
const preliminaresStore = usePreliminaresStore();

onMounted(() => {
  preliminaresStore.fetchList(props.type);
});

const searchTerm = ref<string>('');
// Id pendiente de confirmación de borrado: borrar el trabajo de otro cajero
// por un clic de más no tiene vuelta atrás.
const idToDelete = ref<number | null>(null);

const filtered = computed<PreliminarSummary[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();
  if (term === '') {
    return preliminaresStore.list;
  }
  return preliminaresStore.list.filter(
    (item) =>
      item.label.toLowerCase().includes(term) ||
      (item.userName ?? '').toLowerCase().includes(term),
  );
});

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' });
}

async function confirmDelete(id: number): Promise<void> {
  await preliminaresStore.remove(id);
  idToDelete.value = null;
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4"
      @click.self="emit('close')"
    >
      <div class="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="text-lg font-semibold text-gray-800">{{ t('preliminares.picker.title') }}</h2>
        <p class="mt-1 text-sm text-gray-500">{{ t('preliminares.picker.subtitle') }}</p>

        <input
          v-model="searchTerm"
          type="search"
          :placeholder="t('preliminares.picker.searchPlaceholder')"
          class="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        />

        <p v-if="preliminaresStore.isLoading" class="mt-6 text-sm text-gray-400">
          {{ t('preliminares.picker.loading') }}
        </p>

        <p v-else-if="filtered.length === 0" class="mt-6 text-sm text-gray-400">
          {{ t('preliminares.picker.empty') }}
        </p>

        <ul v-else class="mt-4 divide-y divide-gray-100">
          <li v-for="item in filtered" :key="item.id" class="py-3">
            <div class="flex items-start justify-between gap-4">
              <button
                type="button"
                class="flex-1 text-left"
                @click="emit('select', item)"
              >
                <p class="font-medium text-gray-800">{{ item.label }}</p>
                <p class="mt-0.5 text-xs text-gray-500">
                  {{ t('preliminares.picker.items', item.itemsCount) }}
                  · {{ item.userName ?? '—' }}
                  · {{ formatDate(item.updatedAt) }}
                </p>
              </button>

              <div v-if="idToDelete === item.id" class="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                  @click="confirmDelete(item.id)"
                >
                  {{ t('preliminares.picker.confirmDelete') }}
                </button>
                <button
                  type="button"
                  class="rounded-lg px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
                  @click="idToDelete = null"
                >
                  {{ t('common.cancel') }}
                </button>
              </div>
              <button
                v-else
                type="button"
                class="shrink-0 rounded-lg px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                @click="idToDelete = item.id"
              >
                {{ t('common.delete') }}
              </button>
            </div>
          </li>
        </ul>

        <div class="mt-6 flex justify-end">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            @click="emit('close')"
          >
            {{ t('common.close') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
