<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import ProveedorForm from '../components/ProveedorForm.vue';
import type { ProveedorFormData } from '../interfaces/proveedor.interface';
import { useProveedorStore } from '../interfaces/proveedor.store';

const { t } = useI18n();
const router = useRouter();
const proveedorStore = useProveedorStore();

const emptyProveedor: ProveedorFormData = {
  codigo: '',
  nombre: '',
  rif: '',
  nit: '',
  direccion: '',
  telefono: '',
  email: '',
  monedaCuentaId: 0,
  diasCredito: 0,
  activo: true,
};

async function handleSubmit(data: ProveedorFormData): Promise<void> {
  try {
    await proveedorStore.addProveedor(data);
    router.push('/master/proveedores');
  } catch {
    // proveedorStore.saveError already holds the message; ProveedorForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.proveedores.newProveedor') }}</h1>

    <ProveedorForm
      :initial-data="emptyProveedor"
      :submit-label="t('common.save')"
      :is-saving="proveedorStore.isSaving"
      :error-message="proveedorStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
