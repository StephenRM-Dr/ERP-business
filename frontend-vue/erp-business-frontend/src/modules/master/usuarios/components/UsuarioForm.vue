<script setup lang="ts">
import { computed, onMounted, reactive, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';

import { flattenModuleCatalog } from '@/config/module-catalog';
import { useRolStore } from '@/modules/master/roles/interfaces/rol.store';
import { useSucursalStore } from '@/modules/master/sucursales/interfaces/sucursal.store';
import type { UsuarioFormData } from '../interfaces/usuario.interface';

const props = defineProps<{
  initialData: UsuarioFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
  /** Create view requires a password; edit view leaves it blank to keep the current one. */
  isPasswordRequired?: boolean;
}>();

const emit = defineEmits<{
  submit: [data: UsuarioFormData];
}>();

const { t } = useI18n();
const rolStore = useRolStore();
const sucursalStore = useSucursalStore();

onMounted(() => {
  if (rolStore.rolList.length === 0) {
    rolStore.fetchRoles();
  }
  if (sucursalStore.sucursalList.length === 0) {
    sucursalStore.fetchSucursales();
  }
});

const form = reactive<UsuarioFormData>({ ...props.initialData });

// Read-only preview of the modules the selected rol grants — actual
// assignment happens on the Rol form. GET /roles (list) doesn't include
// permisos, so fetch them on demand for whichever rol is selected.
watchEffect(() => {
  if (form.rolId !== null) {
    rolStore.ensureRolPermisos(String(form.rolId));
  }
});

const modulosHeredados = computed<string[]>(() => {
  if (form.rolId === null) {
    return [];
  }
  const rol = rolStore.getRolById(String(form.rolId));
  return rol?.modulosPermitidos ?? [];
});

const flatModuleCatalog = flattenModuleCatalog();

function moduleLabelKey(moduleId: string): string {
  return flatModuleCatalog.find((module) => module.id === moduleId)?.labelKey ?? moduleId;
}

// Editing an existing usuario swaps initialData after the store loads it.
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
      <label for="username" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.usuarios.form.username') }}
      </label>
      <input
        id="username"
        v-model="form.username"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="nombreCompleto" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.usuarios.form.nombreCompleto') }}
      </label>
      <input
        id="nombreCompleto"
        v-model="form.nombreCompleto"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="password" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.usuarios.form.password') }}
      </label>
      <input
        id="password"
        v-model="form.password"
        type="password"
        autocomplete="new-password"
        :required="isPasswordRequired"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
      <p v-if="!isPasswordRequired" class="mt-1 text-xs text-gray-400">
        {{ t('master.usuarios.form.passwordEditHint') }}
      </p>
    </div>

    <div>
      <label for="email" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.usuarios.form.email') }}
      </label>
      <input
        id="email"
        v-model="form.email"
        type="text"
        inputmode="email"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <div>
      <label for="rolId" class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.usuarios.form.rolId') }}
      </label>
      <select
        id="rolId"
        v-model="form.rolId"
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="null">{{ t('master.usuarios.form.selectRol') }}</option>
        <option v-for="rol in rolStore.sortedRoles" :key="rol.id" :value="Number(rol.id)">
          {{ rol.nombre }}
        </option>
      </select>
    </div>

    <div v-if="form.rolId !== null" class="sm:col-span-2">
      <p class="mb-1 block text-xs font-medium text-gray-500">
        {{ t('master.usuarios.form.modulosHeredados') }}
      </p>
      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <span v-if="modulosHeredados.length === 0">
          {{ t('master.usuarios.form.modulosHeredadosEmpty') }}
        </span>
        <span v-else class="flex flex-wrap gap-1">
          <span
            v-for="moduleId in modulosHeredados"
            :key="moduleId"
            class="rounded-full bg-brand/15 px-2 py-0.5 text-brand-hover"
          >
            {{ t(moduleLabelKey(moduleId)) }}
          </span>
        </span>
      </div>
    </div>

    <div>
      <label for="sucursalId" class="mb-1 block text-xs font-bold text-gray-700">
        {{ t('master.usuarios.form.sucursalId') }} / Alcance de Operación
      </label>
      <select
        id="sucursalId"
        v-model="form.sucursalId"
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option :value="null">🌐 Todas las Sucursales (Acceso Global / Puede operar en cualquier tienda)</option>
        <option
          v-for="sucursal in sucursalStore.sortedSucursales"
          :key="sucursal.id"
          :value="Number(sucursal.id)"
        >
          🏢 {{ sucursal.nombre }} (Restringido solo a esta tienda)
        </option>
      </select>
      <p class="mt-1 text-[11px] text-gray-500">
        Si se asigna una sucursal específica, el usuario solo podrá ver, facturar, hacer ajustes y consultar movimientos de esa tienda. Si se deja en "Todas las sucursales" o es Administrador, tendrá acceso global.
      </p>
    </div>

    <div class="flex items-center gap-2 sm:col-span-2">
      <input
        id="activo"
        v-model="form.activo"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
      />
      <label for="activo" class="text-sm text-gray-700">
        {{ t('master.usuarios.form.isActive') }}
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
        to="/master/usuarios"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('master.usuarios.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
