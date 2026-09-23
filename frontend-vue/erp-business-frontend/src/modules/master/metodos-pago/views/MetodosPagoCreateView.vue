<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import MetodoPagoForm from '../components/MetodoPagoForm.vue';
import type { MetodoPagoFormData } from '../interfaces/metodo-pago.interface';
import { useMetodoPagoStore } from '../interfaces/metodo-pago.store';

const { t } = useI18n();
const router = useRouter();
const metodoStore = useMetodoPagoStore();

const emptyMetodo: MetodoPagoFormData = {
  codigo: '',
  nombre: '',
  monedaId: 0,
  activo: true,
  requiereCuentaBancaria: false,
};

async function handleSubmit(data: MetodoPagoFormData): Promise<void> {
  try {
    await metodoStore.addMetodo(data);
    router.push('/master/metodos-pago');
  } catch {
    // metodoStore.saveError already holds the message; MetodoPagoForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.metodosPago.newMetodo') }}</h1>

    <MetodoPagoForm
      :initial-data="emptyMetodo"
      :submit-label="t('common.save')"
      :is-saving="metodoStore.isSaving"
      :error-message="metodoStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
