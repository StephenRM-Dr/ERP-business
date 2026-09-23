<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import WarehouseForm from '../components/WarehouseForm.vue';
import type { WarehouseFormData } from '../interfaces/warehouse.interface';
import { useWarehouseStore } from '../interfaces/warehouse.store';

const { t } = useI18n();
const router = useRouter();
const warehouseStore = useWarehouseStore();

const emptyWarehouse: WarehouseFormData = {
  codigo: '',
  name: '',
  responsable: '',
  sucursalId: 0,
  isActive: true,
  permiteFacturar: true,
};

async function handleSubmit(data: WarehouseFormData): Promise<void> {
  try {
    await warehouseStore.addWarehouse(data);
    router.push('/inventory/warehouses');
  } catch {
    // warehouseStore.saveError already holds the message; WarehouseForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.warehouses.newWarehouse') }}</h1>

    <WarehouseForm
      :initial-data="emptyWarehouse"
      :submit-label="t('common.save')"
      :is-saving="warehouseStore.isSaving"
      :error-message="warehouseStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
