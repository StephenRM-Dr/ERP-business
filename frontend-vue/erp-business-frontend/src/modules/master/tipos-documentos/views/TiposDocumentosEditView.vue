<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import TipoDocumentoForm from '../components/TipoDocumentoForm.vue';
import type { TipoDocumentoFormData } from '../interfaces/tipo-documento.interface';
import { useTipoDocumentoStore } from '../interfaces/tipo-documento.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const tipoDocumentoStore = useTipoDocumentoStore();

const tipoId = computed<string>(() => String(route.params.id));
const tipo = computed(() => tipoDocumentoStore.getTipoDocumentoById(tipoId.value));

onMounted(() => {
  if (tipoDocumentoStore.tipoDocumentoList.length === 0) {
    tipoDocumentoStore.fetchTiposDocumentos();
  }
});

async function handleSubmit(data: TipoDocumentoFormData): Promise<void> {
  try {
    await tipoDocumentoStore.updateTipoDocumento(tipoId.value, data);
    router.push('/master/tipos-documentos');
  } catch {
    // tipoDocumentoStore.saveError already holds the message; the form displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.tiposDocumentos.editTipoDocumento') }}</h1>

    <TipoDocumentoForm
      v-if="tipo"
      :initial-data="tipo"
      :submit-label="t('common.save')"
      :is-saving="tipoDocumentoStore.isSaving"
      :error-message="tipoDocumentoStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('master.tiposDocumentos.notFound') }}
    </p>
  </div>
</template>
