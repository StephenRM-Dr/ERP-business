<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import ParametroFiscalForm from '../components/ParametroFiscalForm.vue';
import type { ParametroFiscalFormData } from '../interfaces/parametro-fiscal.interface';
import { useParametroFiscalStore } from '../interfaces/parametro-fiscal.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const parametroStore = useParametroFiscalStore();

const parametroId = computed<string>(() => String(route.params.id));
const parametro = computed(() => parametroStore.getParametroById(parametroId.value));

onMounted(() => {
  if (parametroStore.parametroList.length === 0) {
    parametroStore.fetchParametros();
  }
});

async function handleSubmit(data: ParametroFiscalFormData): Promise<void> {
  try {
    await parametroStore.updateParametro(parametroId.value, data);
    router.push('/master/parametros');
  } catch {
    // parametroStore.saveError already holds the message; ParametroFiscalForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.parametros.editParametro') }}</h1>

    <ParametroFiscalForm
      v-if="parametro"
      :initial-data="parametro"
      :submit-label="t('common.save')"
      :is-saving="parametroStore.isSaving"
      :error-message="parametroStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('master.parametros.notFound') }}
    </p>
  </div>
</template>
