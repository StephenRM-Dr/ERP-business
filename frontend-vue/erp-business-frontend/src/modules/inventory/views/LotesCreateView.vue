<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import LoteForm from '../components/LoteForm.vue';
import type { LoteFormData } from '../interfaces/lote.interface';
import { useLoteStore } from '../interfaces/lote.store';

const { t } = useI18n();
const router = useRouter();
const loteStore = useLoteStore();

const emptyLote: LoteFormData = {
  productoId: 0,
  numeroLote: '',
  fechaVencimiento: '',
};

async function handleSubmit(data: LoteFormData): Promise<void> {
  try {
    await loteStore.addLote(data);
    router.push('/inventory/lotes');
  } catch {
    // loteStore.saveError already holds the message; LoteForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.lotes.newLote') }}</h1>

    <LoteForm
      :initial-data="emptyLote"
      :submit-label="t('common.save')"
      :is-saving="loteStore.isSaving"
      :error-message="loteStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
