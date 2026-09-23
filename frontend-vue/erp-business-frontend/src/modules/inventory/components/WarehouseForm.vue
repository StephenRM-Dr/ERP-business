<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSucursalStore } from '@/modules/master/sucursales/interfaces/sucursal.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';
import type { WarehouseFormData } from '../interfaces/warehouse.interface';

const props = defineProps<{
  initialData: WarehouseFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: WarehouseFormData];
}>();

const { t } = useI18n();
const sucursalStore = useSucursalStore();
const warehouseStore = useWarehouseStore();

const form = reactive<WarehouseFormData>({ ...props.initialData });

// Editing an existing warehouse swaps initialData after the store loads it.
watch(
  () => props.initialData,
  (data) => Object.assign(form, data),
);

onMounted(() => {
  if (sucursalStore.sucursalList.length === 0) {
    sucursalStore.fetchSucursales();
  }
  if (warehouseStore.warehouseList.length === 0) {
    warehouseStore.fetchWarehouses();
  }
});

/** Next free "ALM-0N" for the chosen sucursal, based on already-taken ALM-NN codes there. */
function suggestCorrelativo(sucursalId: number): string {
  const taken = warehouseStore.warehouseList
    .filter((w) => w.sucursalId === sucursalId)
    .map((w) => Number(/^ALM-(\d+)$/.exec(w.codigo)?.[1]))
    .filter((n) => !Number.isNaN(n));
  const next = taken.length > 0 ? Math.max(...taken) + 1 : 1;
  return `ALM-${String(next).padStart(2, '0')}`;
}

// Only auto-fill when the user hasn't typed a codigo yet — never overwrite a manual entry.
watch(
  () => form.sucursalId,
  (sucursalId) => {
    if (sucursalId && form.codigo.trim() === '') {
      form.codigo = suggestCorrelativo(sucursalId);
    }
  },
);

function regenerateCorrelativo(): void {
  if (form.sucursalId) {
    form.codigo = suggestCorrelativo(form.sucursalId);
  }
}

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
      <div class="mb-1 flex items-center justify-between">
        <label for="codigo" class="block text-xs font-medium text-gray-500">
          {{ t('inventory.warehouses.form.codigo') }}
        </label>
        <button
          type="button"
          :disabled="!form.sucursalId"
          class="text-xs font-medium text-brand hover:text-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          @click="regenerateCorrelativo"
        >
          {{ t('inventory.warehouses.form.generateCorrelativo') }}
        </button>
      </div>
      <input
        id="codigo"
        v-model="form.codigo"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="name" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.warehouses.form.name') }}
      </label>
      <input
        id="name"
        v-model="form.name"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="sucursalId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.warehouses.form.sucursal') }}
      </label>
      <select
        id="sucursalId"
        v-model.number="form.sucursalId"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="0" disabled>{{ t('inventory.warehouses.form.selectSucursal') }}</option>
        <option
          v-for="sucursal in sucursalStore.sortedSucursales"
          :key="sucursal.id"
          :value="Number(sucursal.id)"
        >
          {{ sucursal.nombre }}
        </option>
      </select>
    </div>

    <div>
      <label for="responsable" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('inventory.warehouses.form.responsable') }}
      </label>
      <input
        id="responsable"
        v-model="form.responsable"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="flex flex-col gap-2 sm:col-span-2">
      <div class="flex items-center gap-2">
        <input
          id="isActive"
          v-model="form.isActive"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
        />
        <label for="isActive" class="text-sm font-medium text-gray-700">
          {{ t('inventory.warehouses.form.isActive') }}
        </label>
      </div>

      <div class="flex items-center gap-2">
        <input
          id="permiteFacturar"
          v-model="form.permiteFacturar"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30"
        />
        <label for="permiteFacturar" class="text-sm font-medium text-gray-700">
          🏢 Habilitado para Facturación (Permite emitir facturas desde este depósito)
        </label>
      </div>
      <p class="text-[11px] text-gray-500 pl-6">
        Si este almacén es solo de tránsito, custodia o depósito central (ej. Almacén Guayana), desactive esta casilla para evitar que se le facture directamente.
      </p>
    </div>

    <p
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-2"
    >
      {{ t(errorMessage) }}
    </p>

    <div class="flex justify-end gap-3 sm:col-span-2">
      <RouterLink
        to="/inventory/warehouses"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('inventory.warehouses.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
