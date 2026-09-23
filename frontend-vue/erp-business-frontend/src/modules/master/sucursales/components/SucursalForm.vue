<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useEmpresaStore } from '@/modules/master/empresas/interfaces/empresa.store';
import type { SucursalFormData } from '../interfaces/sucursal.interface';

const props = defineProps<{
  initialData: SucursalFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: SucursalFormData];
  'branch-preview': [preview: { siglas: string; nombre: string }];
}>();

const { t } = useI18n();
const empresaStore = useEmpresaStore();

onMounted(() => {
  if (empresaStore.empresaList.length === 0) {
    empresaStore.fetchEmpresas();
  }
});

const form = reactive<SucursalFormData>({ ...props.initialData });

// Editing an existing sucursal swaps initialData after the store loads it.
watch(
  () => props.initialData,
  (data) => Object.assign(form, data),
);

// New sucursales default to their parent Empresa's siglas (editable
// afterwards) — only auto-fills while siglas is still empty, so picking a
// different empresa never silently overwrites a value someone already typed
// or that came from an existing sucursal being edited.
watch(
  () => form.empresaId,
  (empresaId) => {
    if (form.siglas.trim() !== '') {
      return;
    }
    const empresa = empresaStore.getEmpresaById(String(empresaId));
    if (empresa?.siglas) {
      form.siglas = empresa.siglas;
    }
  },
);

// Lets a parent (the "create sucursal + initial warehouse" screen) mirror
// siglas/nombre into the warehouse code suggestion without owning this form's state.
watch(
  [() => form.siglas, () => form.nombre],
  ([siglas, nombre]) => emit('branch-preview', { siglas, nombre }),
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
      <label for="empresaId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.sucursales.form.empresaId') }}
      </label>
      <select
        id="empresaId"
        v-model.number="form.empresaId"
        required
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="0" disabled>{{ t('master.sucursales.form.selectEmpresa') }}</option>
        <option
          v-for="empresa in empresaStore.sortedEmpresas"
          :key="empresa.id"
          :value="Number(empresa.id)"
        >
          {{ empresa.nombre }}
        </option>
      </select>
    </div>

    <div>
      <label for="codigo" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.sucursales.form.codigo') }}
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
      <label for="siglas" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.sucursales.form.siglas') }}
      </label>
      <input
        id="siglas"
        v-model="form.siglas"
        type="text"
        maxlength="40"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
      <p class="mt-1 text-xs text-gray-400">{{ t('master.sucursales.form.siglasHint') }}</p>
    </div>

    <div>
      <label for="nombre" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.sucursales.form.nombre') }}
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
      <label for="telefono" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.sucursales.form.telefono') }}
      </label>
      <input
        id="telefono"
        v-model="form.telefono"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="sm:col-span-2">
      <label for="direccion" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.sucursales.form.direccion') }}
      </label>
      <textarea
        id="direccion"
        v-model="form.direccion"
        rows="2"
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
        {{ t('master.sucursales.form.isActive') }}
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
        to="/master/sucursales"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('master.sucursales.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
