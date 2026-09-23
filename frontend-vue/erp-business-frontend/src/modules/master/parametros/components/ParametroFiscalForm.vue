<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ParametroFiscalFormData } from '../interfaces/parametro-fiscal.interface';

const props = defineProps<{
  initialData: ParametroFiscalFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: ParametroFiscalFormData];
}>();

const { t } = useI18n();

const form = reactive<ParametroFiscalFormData>({ ...props.initialData });

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
        {{ t('master.parametros.form.codigo') }}
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
      <label for="porcentaje" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.parametros.form.porcentaje') }}
      </label>
      <input
        id="porcentaje"
        v-model.number="form.porcentaje"
        type="number"
        min="0"
        step="0.01"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="sm:col-span-2">
      <label for="descripcion" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.parametros.form.descripcion') }}
      </label>
      <input
        id="descripcion"
        v-model="form.descripcion"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="vigenteDesde" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.parametros.form.vigenteDesde') }}
      </label>
      <input
        id="vigenteDesde"
        v-model="form.vigenteDesde"
        type="date"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="vigenteHasta" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.parametros.form.vigenteHasta') }}
      </label>
      <input
        id="vigenteHasta"
        v-model="form.vigenteHasta"
        type="date"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="flex items-center gap-2 sm:col-span-2">
      <input
        id="activo"
        v-model="form.activo"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
      />
      <label for="activo" class="text-sm text-gray-700">
        {{ t('master.parametros.form.isActive') }}
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
        to="/master/parametros"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('master.parametros.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
