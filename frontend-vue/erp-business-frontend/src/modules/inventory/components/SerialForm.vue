<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useProductStore } from '../interfaces/product.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';
import type { SerialFormData } from '../interfaces/serial.interface';

const props = defineProps<{
  initialData: SerialFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: SerialFormData];
}>();

const { t } = useI18n();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();

onMounted(() => {
  if (productStore.productList.length === 0) {
    productStore.fetchProducts();
  }
  if (warehouseStore.warehouseList.length === 0) {
    warehouseStore.fetchWarehouses();
  }
});

const form = reactive<SerialFormData>({ ...props.initialData });

watch(
  () => props.initialData,
  (data) => Object.assign(form, data),
);

function handleSubmit(): void {
  emit('submit', { ...form });
}
</script>

<template>
  <form
    class="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2"
    @submit.prevent="handleSubmit"
  >
    <div>
      <label for="productoId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.seriales.form.productoId') }}
      </label>
      <select
        id="productoId"
        v-model.number="form.productoId"
        required
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="0" disabled>{{ t('inventory.seriales.form.selectProducto') }}</option>
        <option v-for="product in productStore.sortedProducts" :key="product.id" :value="Number(product.id)">
          {{ product.codigo }} — {{ product.nombre }}
        </option>
      </select>
    </div>

    <div>
      <label for="numeroSerial" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.seriales.form.numeroSerial') }}
      </label>
      <input
        id="numeroSerial"
        v-model="form.numeroSerial"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="depositoId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.seriales.form.depositoId') }}
      </label>
      <select
        id="depositoId"
        v-model="form.depositoId"
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="null">{{ t('inventory.seriales.form.selectDeposito') }}</option>
        <option v-for="warehouse in warehouseStore.sortedWarehouses" :key="warehouse.id" :value="Number(warehouse.id)">
          [{{ warehouse.codigo }}] {{ warehouse.name }}
        </option>
      </select>
    </div>

    <div class="flex items-center gap-2">
      <input
        id="vendido"
        v-model="form.vendido"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
      />
      <label for="vendido" class="text-sm text-gray-700">
        {{ t('inventory.seriales.form.vendido') }}
      </label>
    </div>

    <p
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-2"
    >
      {{ t(errorMessage) }}
    </p>

    <div class="flex justify-end gap-3 sm:col-span-2">
      <RouterLink
        to="/inventory/seriales"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('inventory.seriales.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
