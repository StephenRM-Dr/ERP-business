<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import ParametroFiscalForm from '../components/ParametroFiscalForm.vue';
import type { ParametroFiscalFormData } from '../interfaces/parametro-fiscal.interface';
import { useParametroFiscalStore } from '../interfaces/parametro-fiscal.store';

const { t } = useI18n();
const router = useRouter();
const parametroStore = useParametroFiscalStore();

const emptyParametro: ParametroFiscalFormData = {
  codigo: '',
  descripcion: '',
  porcentaje: 0,
  activo: true,
  vigenteDesde: '',
  vigenteHasta: '',
};

async function handleSubmit(data: ParametroFiscalFormData): Promise<void> {
  try {
    await parametroStore.addParametro(data);
    router.push('/master/parametros');
  } catch {
    // parametroStore.saveError already holds the message; ParametroFiscalForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.parametros.newParametro') }}</h1>

    <ParametroFiscalForm
      :initial-data="emptyParametro"
      :submit-label="t('common.save')"
      :is-saving="parametroStore.isSaving"
      :error-message="parametroStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
