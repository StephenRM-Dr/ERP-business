<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import ProveedorForm from '../components/ProveedorForm.vue';
import type { ProveedorFormData } from '../interfaces/proveedor.interface';
import { useProveedorStore } from '../interfaces/proveedor.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const proveedorStore = useProveedorStore();

const proveedorId = computed<string>(() => String(route.params.id));
const proveedor = computed(() => proveedorStore.getProveedorById(proveedorId.value));

onMounted(() => {
  if (proveedorStore.proveedorList.length === 0) {
    proveedorStore.fetchProveedores();
  }
});

async function handleSubmit(data: ProveedorFormData): Promise<void> {
  try {
    await proveedorStore.updateProveedor(proveedorId.value, data);
    router.push('/master/proveedores');
  } catch {
    // proveedorStore.saveError already holds the message; ProveedorForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.proveedores.editProveedor') }}</h1>

    <ProveedorForm
      v-if="proveedor"
      :initial-data="proveedor"
      :submit-label="t('common.save')"
      :is-saving="proveedorStore.isSaving"
      :error-message="proveedorStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('master.proveedores.notFound') }}
    </p>
  </div>
</template>
