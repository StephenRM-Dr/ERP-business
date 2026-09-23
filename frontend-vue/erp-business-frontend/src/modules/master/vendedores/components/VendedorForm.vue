<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { VendedorFormData } from '../interfaces/vendedor.interface';

const props = defineProps<{
  initialData: VendedorFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: VendedorFormData];
}>();

const { t } = useI18n();

const form = reactive<VendedorFormData>({ ...props.initialData });

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
        {{ t('master.vendedores.form.codigo') }}
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
        {{ t('master.vendedores.form.nombre') }}
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
      <label for="email" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.vendedores.form.email') }}
      </label>
      <input
        id="email"
        v-model="form.email"
        type="email"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="telefono" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.vendedores.form.telefono') }}
      </label>
      <input
        id="telefono"
        v-model="form.telefono"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="comisionPorcentaje" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.vendedores.form.comisionPorcentaje') }}
      </label>
      <input
        id="comisionPorcentaje"
        v-model.number="form.comisionPorcentaje"
        type="number"
        min="0"
        step="0.01"
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
        {{ t('master.vendedores.form.isActive') }}
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
        to="/master/vendedores"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('master.vendedores.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
