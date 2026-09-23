<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useWarehouseStore } from '@/modules/inventory/interfaces/warehouse.store';
import { useTipoDocumentoStore } from '@/modules/master/tipos-documentos/interfaces/tipo-documento.store';
import { resolveApiErrorMessage } from '@/utils/api-error';
import SucursalForm from '../components/SucursalForm.vue';
import type { SucursalFormData } from '../interfaces/sucursal.interface';
import { useSucursalStore } from '../interfaces/sucursal.store';
import { TIPO_DOCUMENTO_TEMPLATE } from '../interfaces/tipo-documento-template';

const { t } = useI18n();
const router = useRouter();
const sucursalStore = useSucursalStore();
const tipoDocumentoStore = useTipoDocumentoStore();
const warehouseStore = useWarehouseStore();

const emptySucursal: SucursalFormData = {
  empresaId: 0,
  codigo: '',
  siglas: '',
  nombre: '',
  direccion: '',
  telefono: '',
  activo: true,
};

// Editable copy of the template — the admin can adjust prefijos per code
// before they're created alongside the new sucursal.
const catalogPrefijos = reactive<Record<string, string>>(
  Object.fromEntries(TIPO_DOCUMENTO_TEMPLATE.map((item) => [item.codigo, item.prefijo])),
);

const catalogError = ref<string>('');

// A sucursal with no almacén registered can't invoice at all (there's
// nowhere to hold or discount stock from) — this is what left sucursales
// like "Pruebitas CA" unable to sell. Collecting its first warehouse right
// here means a new sucursal is immediately usable, not a follow-up task
// someone has to remember.
const initialWarehouse = reactive({
  codigo: '',
  nombre: '',
  responsable: '',
});
const warehouseError = ref<string>('');

// Mirrors SucursalForm's own siglas-autofill pattern: only fills while the
// user hasn't typed into these fields yet, so it never overwrites a manual edit.
function handleBranchPreview({ siglas, nombre }: { siglas: string; nombre: string }): void {
  const trimmedSiglas = siglas.trim();
  const trimmedNombre = nombre.trim();
  if (trimmedSiglas !== '' && initialWarehouse.codigo.trim() === '') {
    initialWarehouse.codigo = `${trimmedSiglas}-ALM1`;
  }
  if (trimmedNombre !== '' && initialWarehouse.nombre.trim() === '') {
    initialWarehouse.nombre = `Almacén Principal ${trimmedNombre}`;
  }
}

async function handleSubmit(data: SucursalFormData): Promise<void> {
  catalogError.value = '';
  warehouseError.value = '';

  let sucursal;
  try {
    sucursal = await sucursalStore.addSucursal(data);
  } catch {
    // sucursalStore.saveError already holds the message; SucursalForm displays it.
    return;
  }

  try {
    for (const item of TIPO_DOCUMENTO_TEMPLATE) {
      await tipoDocumentoStore.addTipoDocumento({
        sucursalId: Number(sucursal.id),
        codigo: item.codigo,
        nombre: item.nombre,
        correlativoActual: 0,
        longitudFormato: 8,
        prefijo: catalogPrefijos[item.codigo] ?? '',
        activo: true,
      });
    }
  } catch (err) {
    // The sucursal itself was created successfully — only the catalog step
    // failed partway through. Keep the user on this page so they can see
    // which codes are missing and finish them from Maestros > Tipos de
    // Documentos, instead of silently leaving the sucursal half-configured.
    catalogError.value = resolveApiErrorMessage(err, t('master.sucursales.form.catalogError'));
    return;
  }

  if (initialWarehouse.codigo.trim() !== '' && initialWarehouse.nombre.trim() !== '') {
    try {
      await warehouseStore.addWarehouse({
        codigo: initialWarehouse.codigo.trim(),
        name: initialWarehouse.nombre.trim(),
        responsable: initialWarehouse.responsable.trim(),
        sucursalId: Number(sucursal.id),
        isActive: true,
        permiteFacturar: true,
      });
    } catch (err) {
      // Same reasoning as the catalog step above: the sucursal (and its
      // tipos_documentos) are already created, only the warehouse failed.
      warehouseError.value = resolveApiErrorMessage(err, t('master.sucursales.form.warehouseError'));
      return;
    }
  }

  router.push('/master/sucursales');
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <h1 class="text-2xl font-bold text-gray-800">{{ t('master.sucursales.newSucursal') }}</h1>

    <SucursalForm
      :initial-data="emptySucursal"
      :submit-label="t('common.save')"
      :is-saving="sucursalStore.isSaving"
      :error-message="sucursalStore.saveError"
      @submit="handleSubmit"
      @branch-preview="handleBranchPreview"
    />

    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-600">
        {{ t('master.sucursales.form.catalogTitle') }}
      </h2>
      <p class="mb-4 text-xs text-gray-500">
        {{ t('master.sucursales.form.catalogDescription') }}
      </p>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-gray-400">
              <th class="pb-2 pr-4 font-medium">{{ t('master.tiposDocumentos.form.codigo') }}</th>
              <th class="pb-2 pr-4 font-medium">{{ t('master.tiposDocumentos.form.nombre') }}</th>
              <th class="pb-2 font-medium">{{ t('master.tiposDocumentos.form.prefijo') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in TIPO_DOCUMENTO_TEMPLATE" :key="item.codigo" class="border-t border-gray-100">
              <td class="py-2 pr-4 font-mono text-gray-700">{{ item.codigo }}</td>
              <td class="py-2 pr-4 text-gray-600">{{ item.nombre }}</td>
              <td class="py-2">
                <input
                  v-model="catalogPrefijos[item.codigo]"
                  type="text"
                  maxlength="10"
                  class="w-32 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="catalogError" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {{ catalogError }}
      </p>
    </div>

    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-600">
        {{ t('master.sucursales.form.warehouseTitle') }}
      </h2>
      <p class="mb-4 text-xs text-gray-500">
        {{ t('master.sucursales.form.warehouseDescription') }}
      </p>

      <div class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div>
          <label for="warehouseCodigo" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('inventory.warehouses.form.codigo') }}
          </label>
          <input
            id="warehouseCodigo"
            v-model="initialWarehouse.codigo"
            type="text"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div>
          <label for="warehouseNombre" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('inventory.warehouses.form.name') }}
          </label>
          <input
            id="warehouseNombre"
            v-model="initialWarehouse.nombre"
            type="text"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div class="sm:col-span-2">
          <label for="warehouseResponsable" class="mb-1 block text-xs font-medium text-gray-500">
            {{ t('inventory.warehouses.form.responsable') }}
          </label>
          <input
            id="warehouseResponsable"
            v-model="initialWarehouse.responsable"
            type="text"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>
      </div>

      <p v-if="warehouseError" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {{ warehouseError }}
      </p>
    </div>
  </div>
</template>
