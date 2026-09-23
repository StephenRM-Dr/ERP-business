<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import WarehouseForm from '../components/WarehouseForm.vue';
import type { WarehouseFormData } from '../interfaces/warehouse.interface';
import { useWarehouseStore } from '../interfaces/warehouse.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const warehouseStore = useWarehouseStore();

const warehouseId = computed<string>(() => String(route.params.id));
const warehouse = computed(() => warehouseStore.getWarehouseById(warehouseId.value));

onMounted(() => {
  // Covers direct navigation to this route, where the list may not be loaded yet.
  if (warehouseStore.warehouseList.length === 0) {
    warehouseStore.fetchWarehouses();
  }
});

async function handleSubmit(data: WarehouseFormData): Promise<void> {
  try {
    await warehouseStore.updateWarehouse(warehouseId.value, data);
    router.push('/inventory/warehouses');
  } catch {
    // warehouseStore.saveError already holds the message; WarehouseForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.warehouses.editWarehouse') }}</h1>

    <WarehouseForm
      v-if="warehouse"
      :initial-data="warehouse"
      :submit-label="t('common.save')"
      :is-saving="warehouseStore.isSaving"
      :error-message="warehouseStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('inventory.warehouses.notFound') }}
    </p>
  </div>
</template>
