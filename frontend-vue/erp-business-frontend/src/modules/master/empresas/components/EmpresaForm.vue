<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { EmpresaFormData } from '../interfaces/empresa.interface';

const props = defineProps<{
  initialData: EmpresaFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: EmpresaFormData];
}>();

const { t } = useI18n();

const form = reactive<EmpresaFormData>({ ...props.initialData });

// Editing an existing empresa swaps initialData after the store loads it.
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
      <label for="nombre" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.empresas.form.nombre') }}
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
      <label for="siglas" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.empresas.form.siglas') }}
      </label>
      <input
        id="siglas"
        v-model="form.siglas"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="rif" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.empresas.form.rif') }}
      </label>
      <input
        id="rif"
        v-model="form.rif"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="nit" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.empresas.form.nit') }}
      </label>
      <input
        id="nit"
        v-model="form.nit"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="sm:col-span-2">
      <label for="direccionFiscal" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.empresas.form.direccionFiscal') }}
      </label>
      <textarea
        id="direccionFiscal"
        v-model="form.direccionFiscal"
        rows="2"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="sm:col-span-2">
      <label for="direccionDespacho" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.empresas.form.direccionDespacho') }}
      </label>
      <textarea
        id="direccionDespacho"
        v-model="form.direccionDespacho"
        rows="2"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="telefono" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.empresas.form.telefono') }}
      </label>
      <input
        id="telefono"
        v-model="form.telefono"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="email" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.empresas.form.email') }}
      </label>
      <input
        id="email"
        v-model="form.email"
        type="text"
        inputmode="email"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="sm:col-span-2">
      <label for="website" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.empresas.form.website') }}
      </label>
      <input
        id="website"
        v-model="form.website"
        type="text"
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
        to="/master/empresas"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('master.empresas.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
