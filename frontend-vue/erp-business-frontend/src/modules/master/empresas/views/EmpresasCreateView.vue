<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import EmpresaForm from '../components/EmpresaForm.vue';
import type { EmpresaFormData } from '../interfaces/empresa.interface';
import { useEmpresaStore } from '../interfaces/empresa.store';

const { t } = useI18n();
const router = useRouter();
const empresaStore = useEmpresaStore();

const emptyEmpresa: EmpresaFormData = {
  nombre: '',
  siglas: '',
  rif: '',
  nit: '',
  direccionFiscal: '',
  direccionDespacho: '',
  telefono: '',
  email: '',
  website: '',
};

async function handleSubmit(data: EmpresaFormData): Promise<void> {
  try {
    await empresaStore.addEmpresa(data);
    router.push('/master/empresas');
  } catch {
    // empresaStore.saveError already holds the message; EmpresaForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.empresas.newEmpresa') }}</h1>

    <EmpresaForm
      :initial-data="emptyEmpresa"
      :submit-label="t('common.save')"
      :is-saving="empresaStore.isSaving"
      :error-message="empresaStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
