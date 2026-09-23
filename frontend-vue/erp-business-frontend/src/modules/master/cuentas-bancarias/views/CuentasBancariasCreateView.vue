<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import CuentaBancariaForm from '../components/CuentaBancariaForm.vue';
import type { CuentaBancariaFormData } from '../interfaces/cuenta-bancaria.interface';
import { useCuentaBancariaStore } from '../interfaces/cuenta-bancaria.store';

const { t } = useI18n();
const router = useRouter();
const cuentaStore = useCuentaBancariaStore();

const emptyCuenta: CuentaBancariaFormData = {
  bancoId: 0,
  numeroCuenta: '',
  tipoCuenta: '',
  monedaId: 0,
  descripcion: '',
  saldoConciliado: 0,
  activo: true,
};

async function handleSubmit(data: CuentaBancariaFormData): Promise<void> {
  try {
    await cuentaStore.addCuenta(data);
    router.push('/master/cuentas-bancarias');
  } catch {
    // cuentaStore.saveError already holds the message; CuentaBancariaForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.cuentasBancarias.newCuenta') }}</h1>

    <CuentaBancariaForm
      :initial-data="emptyCuenta"
      :submit-label="t('common.save')"
      :is-saving="cuentaStore.isSaving"
      :error-message="cuentaStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
