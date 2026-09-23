<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import EmpresaForm from '../components/EmpresaForm.vue';
import type { EmpresaFormData } from '../interfaces/empresa.interface';
import { useEmpresaStore } from '../interfaces/empresa.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const empresaStore = useEmpresaStore();

const empresaId = computed<string>(() => String(route.params.id));
const empresa = computed(() => empresaStore.getEmpresaById(empresaId.value));

onMounted(() => {
  if (empresaStore.empresaList.length === 0) {
    empresaStore.fetchEmpresas();
  }
});

async function handleSubmit(data: EmpresaFormData): Promise<void> {
  try {
    await empresaStore.updateEmpresa(empresaId.value, data);
    router.push('/master/empresas');
  } catch {
    // empresaStore.saveError already holds the message; EmpresaForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.empresas.editEmpresa') }}</h1>

    <EmpresaForm
      v-if="empresa"
      :initial-data="empresa"
      :submit-label="t('common.save')"
      :is-saving="empresaStore.isSaving"
      :error-message="empresaStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('master.empresas.notFound') }}
    </p>
  </div>
</template>
