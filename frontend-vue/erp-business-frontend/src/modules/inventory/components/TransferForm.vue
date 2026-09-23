<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type {
  StockTransferFormData,
  StockTransferItem,
  TransferCategory,
} from '../interfaces/transfer.interface';
import { TRANSFER_CATEGORY_RULES } from '../interfaces/transfer.interface';
import { useWarehouseStore } from '../interfaces/warehouse.store';
import { useProductStore } from '../interfaces/product.store';

const props = defineProps<{
  initialData: StockTransferFormData;
  submitLabel: string;
  isSubmitting?: boolean;
  errorMessage?: string;
  /**
   * Muestra las acciones de documento preliminar (guardar / cargar /
   * imprimir). Solo tiene sentido al crear: editar una transferencia ya
   * emitida no es un borrador.
   */
  showPreliminares?: boolean;
  isSavingPreliminar?: boolean;
}>();

const emit = defineEmits<{
  submit: [data: StockTransferFormData];
  savePreliminar: [data: StockTransferFormData];
  loadPreliminar: [];
  printPreliminar: [data: StockTransferFormData];
}>();

const { t } = useI18n();
const warehouseStore = useWarehouseStore();
const productStore = useProductStore();

onMounted(() => {
  if (warehouseStore.warehouseList.length === 0) {
    warehouseStore.fetchWarehouses();
  }
  if (productStore.productList.length === 0) {
    productStore.fetchProducts();
  }
});

const CATEGORIES: TransferCategory[] = [
  'NEW_MERCHANDISE',
  'BRANCH_TRANSFER',
  'INTERNAL_SAMPLES',
  'INTERNAL_TECH_TEST',
  'QUALITY_QUARANTINE',
  'FRACTIONING_LOSS',
];

const form = reactive<StockTransferFormData>({
  ...props.initialData,
  items: props.initialData.items.map((item) => ({ ...item })),
});

const rules = computed(() => TRANSFER_CATEGORY_RULES[form.category]);

// Switching category can drop a field that no longer applies (e.g. moving
// from a branch transfer to internal consumption removes the destination).
watch(
  () => form.category,
  () => {
    if (!rules.value.requiresOrigin) {
      form.fromWarehouseId = null;
    }
    if (!rules.value.requiresDestination) {
      form.toWarehouseId = null;
    }
  },
);

const destinationOptions = computed(() =>
  warehouseStore.sortedWarehouses.filter((warehouse) => warehouse.id !== form.fromWarehouseId),
);

const isValid = computed<boolean>(
  () =>
    (!rules.value.requiresOrigin || !!form.fromWarehouseId) &&
    (!rules.value.requiresDestination || !!form.toWarehouseId) &&
    (!rules.value.requiresOrigin ||
      !rules.value.requiresDestination ||
      form.fromWarehouseId !== form.toWarehouseId) &&
    form.items.length > 0 &&
    form.items.every((item) => item.productId !== '' && item.quantity > 0),
);

function addItem(): void {
  form.items.push({ productId: '', quantity: 1 });
}

function removeItem(index: number): void {
  form.items.splice(index, 1);
}

function snapshot(): StockTransferFormData {
  return { ...form, items: form.items.map((item: StockTransferItem) => ({ ...item })) };
}

function handleSubmit(): void {
  emit('submit', snapshot());
}

/**
 * Un preliminar no exige que el formulario sea válido — su razón de ser es
 * guardar el pedido a medias. Solo pide que haya al menos una línea con
 * producto elegido, que es lo único que tiene sentido guardar.
 */
const hasSavableItems = computed<boolean>(() =>
  form.items.some((item) => item.productId !== ''),
);
</script>

<template>
  <form
    class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    @submit.prevent="handleSubmit"
  >
    <div>
      <label for="category" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.transfers.form.category') }}
      </label>
      <select
        id="category"
        v-model="form.category"
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option v-for="category in CATEGORIES" :key="category" :value="category">
          {{ t(`inventory.transfers.category.${category}`) }}
        </option>
      </select>
    </div>

    <div class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <div v-if="rules.requiresOrigin">
        <label for="fromWarehouseId" class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('inventory.transfers.form.from') }}
        </label>
        <select
          id="fromWarehouseId"
          v-model="form.fromWarehouseId"
          required
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        >
          <option :value="null" disabled>{{ t('inventory.transfers.form.selectWarehouse') }}</option>
          <option
            v-for="warehouse in warehouseStore.sortedWarehouses"
            :key="warehouse.id"
            :value="warehouse.id"
          >
            [{{ warehouse.codigo }}] {{ warehouse.name }}
          </option>
        </select>
      </div>

      <div v-if="rules.requiresDestination">
        <label for="toWarehouseId" class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('inventory.transfers.form.to') }}
        </label>
        <select
          id="toWarehouseId"
          v-model="form.toWarehouseId"
          required
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        >
          <option :value="null" disabled>{{ t('inventory.transfers.form.selectWarehouse') }}</option>
          <option v-for="warehouse in destinationOptions" :key="warehouse.id" :value="warehouse.id">
            [{{ warehouse.codigo }}] {{ warehouse.name }}
          </option>
        </select>
        <p
          v-if="rules.requiresOrigin && form.fromWarehouseId === form.toWarehouseId && form.toWarehouseId !== null"
          class="mt-1 text-xs text-red-500"
        >
          {{ t('inventory.transfers.form.sameWarehouseError') }}
        </p>
      </div>
    </div>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-medium text-gray-500">{{ t('inventory.transfers.form.items') }}</span>
        <button
          type="button"
          class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
          @click="addItem"
        >
          + {{ t('inventory.transfers.form.addItem') }}
        </button>
      </div>

      <div class="flex flex-col gap-2">
        <div
          v-for="(item, index) in form.items"
          :key="index"
          class="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-2 sm:flex-nowrap"
        >
          <select
            v-model="item.productId"
            required
            :aria-label="t('inventory.transfers.form.product')"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 sm:w-auto sm:flex-1"
          >
            <option value="" disabled>{{ t('inventory.transfers.form.selectProduct') }}</option>
            <option v-for="product in productStore.sortedProducts" :key="product.id" :value="product.id">
              {{ product.codigo }} — {{ product.nombre }}
            </option>
          </select>

          <input
            v-model.number="item.quantity"
            type="number"
            :min="productStore.getProductById(item.productId)?.permiteDecimales ? 0.01 : 1"
            :step="productStore.getProductById(item.productId)?.permiteDecimales ? 0.01 : 1"
            required
            :aria-label="t('inventory.transfers.form.quantity')"
            class="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />

          <button
            type="button"
            class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
            :disabled="form.items.length <= 1"
            @click="removeItem(index)"
          >
            {{ t('common.delete') }}
          </button>
        </div>

        <p v-if="form.items.length === 0" class="text-xs text-gray-400">
          {{ t('inventory.transfers.form.noItems') }}
        </p>
      </div>
    </div>

    <div>
      <label for="notes" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.transfers.form.notes') }}
      </label>
      <textarea
        id="notes"
        v-model="form.notes"
        rows="2"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <!-- Documento preliminar: guardar el pedido a medias, retomarlo o imprimirlo -->
    <div v-if="props.showPreliminares" class="border-t border-gray-100 pt-4">
      <p class="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {{ t('preliminares.groupLabel') }}
      </p>
      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          :disabled="!hasSavableItems || props.isSavingPreliminar"
          class="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
          @click="emit('savePreliminar', snapshot())"
        >
          {{ t('preliminares.actions.save') }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
          @click="emit('loadPreliminar')"
        >
          {{ t('preliminares.actions.load') }}
        </button>
        <button
          type="button"
          :disabled="!hasSavableItems"
          class="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
          @click="emit('printPreliminar', snapshot())"
        >
          {{ t('preliminares.actions.print') }}
        </button>
      </div>
    </div>

    <div class="flex justify-end gap-3">
      <RouterLink
        to="/inventory/transfers"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="!isValid || isSubmitting"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ submitLabel }}
      </button>
    </div>
  </form>
</template>
