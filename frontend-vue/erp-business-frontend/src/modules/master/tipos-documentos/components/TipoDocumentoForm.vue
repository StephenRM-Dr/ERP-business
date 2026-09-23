<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSucursalStore } from '@/modules/master/sucursales/interfaces/sucursal.store';
import type { TipoDocumentoFormData } from '../interfaces/tipo-documento.interface';

const props = defineProps<{
  initialData: TipoDocumentoFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: TipoDocumentoFormData];
}>();

const { t } = useI18n();
const sucursalStore = useSucursalStore();

onMounted(() => {
  if (sucursalStore.sucursalList.length === 0) {
    sucursalStore.fetchSucursales();
  }
});

const form = reactive<TipoDocumentoFormData>({ ...props.initialData });

// Editing an existing tipo swaps initialData after the store loads it.
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
      <label for="sucursalId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.tiposDocumentos.form.sucursalId') }}
      </label>
      <select
        id="sucursalId"
        v-model.number="form.sucursalId"
        required
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="0" disabled>{{ t('master.tiposDocumentos.form.selectSucursal') }}</option>
        <option v-for="sucursal in sucursalStore.sortedSucursales" :key="sucursal.id" :value="Number(sucursal.id)">
          {{ sucursal.nombre }}
        </option>
      </select>
    </div>

    <div>
      <label for="codigo" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.tiposDocumentos.form.codigo') }}
      </label>
      <input
        id="codigo"
        v-model="form.codigo"
        type="text"
        maxlength="10"
        required
        :placeholder="t('master.tiposDocumentos.form.codigoPlaceholder')"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div class="sm:col-span-2">
      <label for="nombre" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.tiposDocumentos.form.nombre') }}
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
      <label for="prefijo" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.tiposDocumentos.form.prefijo') }}
      </label>
      <input
        id="prefijo"
        v-model="form.prefijo"
        type="text"
        maxlength="10"
        :placeholder="`${form.codigo || 'FAC'}-`"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="longitudFormato" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.tiposDocumentos.form.longitudFormato') }}
      </label>
      <input
        id="longitudFormato"
        v-model.number="form.longitudFormato"
        type="number"
        min="1"
        max="20"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
      <p class="mt-1 text-xs text-gray-400">{{ t('master.tiposDocumentos.form.longitudFormatoHint') }}</p>
    </div>

    <div>
      <label for="correlativoActual" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.tiposDocumentos.form.correlativoActual') }}
      </label>
      <input
        id="correlativoActual"
        v-model.number="form.correlativoActual"
        type="number"
        min="0"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
      <p class="mt-1 text-xs text-amber-600">{{ t('master.tiposDocumentos.form.correlativoActualHint') }}</p>
    </div>

    <div class="flex items-center gap-2 sm:col-span-2">
      <input
        id="activo"
        v-model="form.activo"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
      />
      <label for="activo" class="text-sm text-gray-700">
        {{ t('master.tiposDocumentos.form.isActive') }}
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
        to="/master/tipos-documentos"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('master.tiposDocumentos.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
