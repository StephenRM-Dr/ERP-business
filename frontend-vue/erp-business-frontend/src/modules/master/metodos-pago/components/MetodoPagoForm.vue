<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useMonedaStore } from '@/modules/inventory/interfaces/moneda.store';
import type { MetodoPagoFormData } from '../interfaces/metodo-pago.interface';

const props = defineProps<{
  initialData: MetodoPagoFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: MetodoPagoFormData];
}>();

const { t } = useI18n();
const monedaStore = useMonedaStore();

onMounted(() => {
  if (monedaStore.monedaList.length === 0) {
    monedaStore.fetchMonedas();
  }
});

const form = reactive<MetodoPagoFormData>({ ...props.initialData });

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
      <label for="codigo" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.metodosPago.form.codigo') }}
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
        {{ t('master.metodosPago.form.nombre') }}
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
      <label for="monedaId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.metodosPago.form.monedaId') }}
      </label>
      <select
        id="monedaId"
        v-model.number="form.monedaId"
        required
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="0" disabled>{{ t('master.metodosPago.form.selectMoneda') }}</option>
        <option v-for="moneda in monedaStore.activeMonedas" :key="moneda.id" :value="moneda.id">
          {{ moneda.codigoIso }} — {{ moneda.descripcion }}
        </option>
      </select>
    </div>

    <div class="flex items-center gap-2">
      <input
        id="requiereCuentaBancaria"
        v-model="form.requiereCuentaBancaria"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
      />
      <label for="requiereCuentaBancaria" class="text-sm text-gray-700">
        {{ t('master.metodosPago.form.requiereCuentaBancaria') }}
      </label>
    </div>

    <div class="flex items-center gap-2 sm:col-span-2">
      <input
        id="activo"
        v-model="form.activo"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
      />
      <label for="activo" class="text-sm text-gray-700">
        {{ t('master.metodosPago.form.isActive') }}
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
        to="/master/metodos-pago"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('master.metodosPago.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
