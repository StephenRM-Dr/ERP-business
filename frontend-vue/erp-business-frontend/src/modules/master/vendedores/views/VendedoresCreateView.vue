<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import VendedorForm from '../components/VendedorForm.vue';
import type { VendedorFormData } from '../interfaces/vendedor.interface';
import { useVendedorStore } from '../interfaces/vendedor.store';

const { t } = useI18n();
const router = useRouter();
const vendedorStore = useVendedorStore();

const emptyVendedor: VendedorFormData = {
  codigo: '',
  nombre: '',
  email: '',
  telefono: '',
  comisionPorcentaje: 0,
  activo: true,
};

async function handleSubmit(data: VendedorFormData): Promise<void> {
  try {
    await vendedorStore.addVendedor(data);
    router.push('/master/vendedores');
  } catch {
    // vendedorStore.saveError already holds the message; VendedorForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.vendedores.newVendedor') }}</h1>

    <VendedorForm
      :initial-data="emptyVendedor"
      :submit-label="t('common.save')"
      :is-saving="vendedorStore.isSaving"
      :error-message="vendedorStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
