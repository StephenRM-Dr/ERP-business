<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ProductFormData } from '../interfaces/product.interface';
import { useCategoryStore } from '../interfaces/category.store';
import { useMonedaStore } from '../interfaces/moneda.store';

const props = defineProps<{
  initialData: ProductFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: ProductFormData];
}>();

const { t } = useI18n();
const categoryStore = useCategoryStore();
const monedaStore = useMonedaStore();

onMounted(() => {
  if (categoryStore.categoryList.length === 0) {
    categoryStore.fetchCategories();
  }
  if (monedaStore.monedaList.length === 0) {
    monedaStore.fetchMonedas();
  }
});

const UNITS = ['UND', 'MT', 'ROLLO', 'CAJA', 'PAQUETE'] as const;

const form = reactive<ProductFormData>({ ...props.initialData });

// Local-only capture for when maneja_lotes/maneja_seriales is turned on.
// The backend has no lote/serial columns yet (forbidNonWhitelisted would
// reject them), so these never leave the form until that support exists.
const loteInicial = ref('');
const serialInicial = ref('');

// Real catalogs from the backend (GET /categorias, GET /monedas).
const categoriaOptions = computed(() =>
  categoryStore.sortedCategories.map((category) => ({
    id: Number(category.id),
    name: category.nombre,
  })),
);

const monedaOptions = computed(() =>
  monedaStore.activeMonedas.map((moneda) => ({
    id: moneda.id,
    name: `${moneda.codigoIso} — ${moneda.descripcion}`,
  })),
);

// Editing an existing product swaps initialData after the store loads it.
watch(
  () => props.initialData,
  (data) => Object.assign(form, data),
);

// Empty optional-number inputs come back as '' from the <input>, not null;
// normalize before sending so the backend's @IsOptional() can skip validation.
function toNullableNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function handleSubmit(): void {
  emit('submit', {
    ...form,
    precioCosto: toNullableNumber(form.precioCosto),
    impuestoPorcentaje: toNullableNumber(form.impuestoPorcentaje),
    capacidadContenido: toNullableNumber(form.capacidadContenido),
    montoComision: toNullableNumber(form.montoComision),
    departamentoId: toNullableNumber(form.departamentoId),
  });
}
</script>

<template>
  <form
    class="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2"
    @submit.prevent="handleSubmit"
  >
    <div>
      <label for="codigo" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.codigo') }}
      </label>
      <input
        id="codigo"
        v-model="form.codigo"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="nombre" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.name') }}
      </label>
      <input
        id="nombre"
        v-model="form.nombre"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="categoriaId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.categoriaId') }}
      </label>
      <select
        id="categoriaId"
        v-model.number="form.categoriaId"
        required
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="0" disabled>{{ t('inventory.products.form.selectCategory') }}</option>
        <option v-for="option in categoriaOptions" :key="option.id" :value="option.id">
          {{ option.name }}
        </option>
      </select>
    </div>

    <div>
      <label for="monedaBaseId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.monedaBaseId') }}
      </label>
      <select
        id="monedaBaseId"
        v-model.number="form.monedaBaseId"
        required
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="0" disabled>{{ t('inventory.products.form.selectCurrency') }}</option>
        <option v-for="option in monedaOptions" :key="option.id" :value="option.id">
          {{ option.name }}
        </option>
      </select>
    </div>

    <div>
      <label for="unidadMedida" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.unit') }}
      </label>
      <select
        id="unidadMedida"
        v-model="form.unidadMedida"
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option v-for="unit in UNITS" :key="unit" :value="unit">{{ unit }}</option>
      </select>
    </div>

    <div>
      <label for="pesoKg" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.weightKg') }}
      </label>
      <input
        id="pesoKg"
        v-model.number="form.pesoKg"
        type="number"
        min="0"
        step="0.01"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
      <p class="mt-1 text-xs text-gray-400">{{ t('inventory.products.form.weightKgHint') }}</p>
    </div>

    <div class="sm:col-span-2">
      <label for="descripcionDetallada" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.description') }}
      </label>
      <textarea
        id="descripcionDetallada"
        v-model="form.descripcionDetallada"
        rows="3"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="referencia" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.referencia') }}
      </label>
      <input
        id="referencia"
        v-model="form.referencia"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="marca" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.marca') }}
      </label>
      <input
        id="marca"
        v-model="form.marca"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="modelo" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.modelo') }}
      </label>
      <input
        id="modelo"
        v-model="form.modelo"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="departamentoId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.departamentoId') }}
      </label>
      <input
        id="departamentoId"
        v-model.number="form.departamentoId"
        type="number"
        min="1"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="precioCosto" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.precioCosto') }}
      </label>
      <input
        id="precioCosto"
        v-model.number="form.precioCosto"
        type="number"
        min="0"
        step="0.01"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="impuestoPorcentaje" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.impuestoPorcentaje') }}
      </label>
      <input
        id="impuestoPorcentaje"
        v-model.number="form.impuestoPorcentaje"
        type="number"
        min="0"
        step="0.01"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="capacidadContenido" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.capacidadContenido') }}
      </label>
      <input
        id="capacidadContenido"
        v-model.number="form.capacidadContenido"
        type="number"
        min="0"
        step="0.0001"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="montoComision" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.montoComision') }}
      </label>
      <input
        id="montoComision"
        v-model.number="form.montoComision"
        type="number"
        min="0"
        step="0.01"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="flex flex-wrap items-center gap-6 sm:col-span-2">
      <div class="flex items-center gap-2">
        <input
          id="activo"
          v-model="form.activo"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
        />
        <label for="activo" class="text-sm text-gray-700">
          {{ t('inventory.products.form.isActive') }}
        </label>
      </div>

      <div class="flex items-center gap-2">
        <input
          id="manejaLotes"
          v-model="form.manejaLotes"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
        />
        <label for="manejaLotes" class="text-sm text-gray-700">
          {{ t('inventory.products.form.manejaLotes') }}
        </label>
      </div>

      <div class="flex items-center gap-2">
        <input
          id="manejaSeriales"
          v-model="form.manejaSeriales"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
        />
        <label for="manejaSeriales" class="text-sm text-gray-700">
          {{ t('inventory.products.form.manejaSeriales') }}
        </label>
      </div>

      <div class="flex items-center gap-2">
        <input
          id="permiteDecimales"
          v-model="form.permiteDecimales"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
        />
        <label for="permiteDecimales" class="text-sm text-gray-700">
          {{ t('inventory.products.form.permiteDecimales') }}
        </label>
      </div>

      <div class="flex items-center gap-2">
        <input
          id="sujetoComisionFija"
          v-model="form.sujetoComisionFija"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
        />
        <label for="sujetoComisionFija" class="text-sm text-gray-700">
          {{ t('inventory.products.form.sujetoComisionFija') }}
        </label>
      </div>
    </div>

    <div v-if="form.manejaLotes">
      <label for="loteInicial" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.loteInicial') }}
      </label>
      <input
        id="loteInicial"
        v-model="loteInicial"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
      <p class="mt-1 text-xs text-gray-400">{{ t('inventory.products.form.loteInicialHint') }}</p>
    </div>

    <div v-if="form.manejaSeriales">
      <label for="serialInicial" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.products.form.serialInicial') }}
      </label>
      <input
        id="serialInicial"
        v-model="serialInicial"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
      <p class="mt-1 text-xs text-gray-400">{{ t('inventory.products.form.serialInicialHint') }}</p>
    </div>

    <p
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-2"
    >
      {{ t(errorMessage) }}
    </p>

    <div class="flex justify-end gap-3 sm:col-span-2">
      <RouterLink
        to="/inventory/products"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('inventory.products.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
