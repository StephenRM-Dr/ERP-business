<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useProductStore } from '../interfaces/product.store';
import type { LoteFormData } from '../interfaces/lote.interface';

const props = defineProps<{
  initialData: LoteFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: LoteFormData];
}>();

const { t } = useI18n();
const productStore = useProductStore();

onMounted(() => {
  if (productStore.productList.length === 0) {
    productStore.fetchProducts();
  }
});

const form = reactive<LoteFormData>({ ...props.initialData });

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
        {{ t('inventory.lotes.form.productoId') }}
      </label>
      <select
        id="productoId"
        v-model.number="form.productoId"
        required
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="0" disabled>{{ t('inventory.lotes.form.selectProducto') }}</option>
        <option v-for="product in productStore.sortedProducts" :key="product.id" :value="Number(product.id)">
          {{ product.codigo }} — {{ product.nombre }}
        </option>
      </select>
    </div>

    <div>
      <label for="numeroLote" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.lotes.form.numeroLote') }}
      </label>
      <input
        id="numeroLote"
        v-model="form.numeroLote"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="fechaVencimiento" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.lotes.form.fechaVencimiento') }}
      </label>
      <input
        id="fechaVencimiento"
        v-model="form.fechaVencimiento"
        type="date"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <p
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-2"
    >
      {{ t(errorMessage) }}
    </p>

    <div class="flex justify-end gap-3 sm:col-span-2">
      <RouterLink
        to="/inventory/lotes"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('inventory.lotes.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
