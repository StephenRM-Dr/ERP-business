<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import CuentaBancariaForm from '../components/CuentaBancariaForm.vue';
import type { CuentaBancariaFormData } from '../interfaces/cuenta-bancaria.interface';
import { useCuentaBancariaStore } from '../interfaces/cuenta-bancaria.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const cuentaStore = useCuentaBancariaStore();

const cuentaId = computed<string>(() => String(route.params.id));
const cuenta = computed(() => cuentaStore.getCuentaById(cuentaId.value));

onMounted(() => {
  if (cuentaStore.cuentaList.length === 0) {
    cuentaStore.fetchCuentas();
  }
});

async function handleSubmit(data: CuentaBancariaFormData): Promise<void> {
  try {
    await cuentaStore.updateCuenta(cuentaId.value, data);
    router.push('/master/cuentas-bancarias');
  } catch {
    // cuentaStore.saveError already holds the message; CuentaBancariaForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.cuentasBancarias.editCuenta') }}</h1>

    <CuentaBancariaForm
      v-if="cuenta"
      :initial-data="cuenta"
      :submit-label="t('common.save')"
      :is-saving="cuentaStore.isSaving"
      :error-message="cuentaStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('master.cuentasBancarias.notFound') }}
    </p>
  </div>
</template>
