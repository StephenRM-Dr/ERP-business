<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import TipoDocumentoForm from '../components/TipoDocumentoForm.vue';
import type { TipoDocumentoFormData } from '../interfaces/tipo-documento.interface';
import { useTipoDocumentoStore } from '../interfaces/tipo-documento.store';

const { t } = useI18n();
const router = useRouter();
const tipoDocumentoStore = useTipoDocumentoStore();

const emptyTipoDocumento: TipoDocumentoFormData = {
  sucursalId: 0,
  codigo: '',
  nombre: '',
  correlativoActual: 0,
  longitudFormato: 8,
  prefijo: '',
  activo: true,
};

async function handleSubmit(data: TipoDocumentoFormData): Promise<void> {
  try {
    await tipoDocumentoStore.addTipoDocumento(data);
    router.push('/master/tipos-documentos');
  } catch {
    // tipoDocumentoStore.saveError already holds the message; the form displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.tiposDocumentos.newTipoDocumento') }}</h1>

    <TipoDocumentoForm
      :initial-data="emptyTipoDocumento"
      :submit-label="t('common.save')"
      :is-saving="tipoDocumentoStore.isSaving"
      :error-message="tipoDocumentoStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
