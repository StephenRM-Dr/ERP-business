<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import LoteForm from '../components/LoteForm.vue';
import type { LoteFormData } from '../interfaces/lote.interface';
import { useLoteStore } from '../interfaces/lote.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const loteStore = useLoteStore();

const loteId = computed<string>(() => String(route.params.id));
const lote = computed(() => loteStore.getLoteById(loteId.value));

onMounted(() => {
  if (loteStore.loteList.length === 0) {
    loteStore.fetchLotes();
  }
});

async function handleSubmit(data: LoteFormData): Promise<void> {
  try {
    await loteStore.updateLote(loteId.value, data);
    router.push('/inventory/lotes');
  } catch {
    // loteStore.saveError already holds the message; LoteForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.lotes.editLote') }}</h1>

    <LoteForm
      v-if="lote"
      :initial-data="lote"
      :submit-label="t('common.save')"
      :is-saving="loteStore.isSaving"
      :error-message="loteStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('inventory.lotes.notFound') }}
    </p>
  </div>
</template>
