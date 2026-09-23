<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { flattenModuleCatalog } from '@/config/module-catalog';
import { usePermisoStore } from '../interfaces/permiso.store';
import type { Permiso } from '../interfaces/permiso.interface';
import type { RolFormData } from '../interfaces/rol.interface';

const props = defineProps<{
  initialData: RolFormData;
  submitLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: RolFormData];
}>();

const { t, te } = useI18n();
const permisoStore = usePermisoStore();

const form = reactive<RolFormData>({
  ...props.initialData,
  modulosPermitidos: [...(props.initialData.modulosPermitidos ?? [])],
});

const searchQuery = ref<string>('');

onMounted(async () => {
  if (permisoStore.permisoList.length === 0) {
    await permisoStore.fetchPermisos();
  }
});

// Sync initialData when it arrives (e.g. after GET /roles/:id resolves in edit view)
watch(
  () => props.initialData,
  (data) => {
    form.nombre = data.nombre;
    form.descripcion = data.descripcion;
    form.activo = data.activo;
    form.modulosPermitidos = [...(data.modulosPermitidos ?? [])];
  },
  { deep: true },
);

const flatCatalog = computed(() => flattenModuleCatalog());

function getLabelForClave(clave: string, defaultDesc: string): string {
  if (clave === 'inventory.summary') {
    return 'Consultar catálogo y existencias de inventario (solo consulta)';
  }
  if (clave === 'inventory.products') {
    return 'Crear y editar productos en inventario (gestión completa)';
  }
  const match = flatCatalog.value.find((item) => item.id === clave);
  if (match && te(match.labelKey)) {
    return t(match.labelKey);
  }
  return defaultDesc || clave;
}

const MODULE_ICONS: Record<string, string> = {
  Facturación: '📑',
  Ventas: '🛒',
  Clientes: '👥',
  Inventario: '📦',
  Compras: '🛍️',
  Maestros: '⚙️',
  Configuración: '🔧',
  Transacciones: '🔄',
  Taller: '✂️',
  General: '🌐',
};

function normalizeModuleName(mod: string, clave?: string): string {
  if (clave && (clave.startsWith('inventory.') || clave.startsWith('inventario.'))) {
    return 'Inventario';
  }
  const trimmed = (mod || '').trim();
  if (trimmed.toLowerCase() === 'inventario') return 'Inventario';
  if (trimmed.toLowerCase() === 'facturación' || trimmed.toLowerCase() === 'facturacion') return 'Facturación';
  if (trimmed.toLowerCase() === 'maestros') return 'Maestros';
  if (trimmed.toLowerCase() === 'compras') return 'Compras';
  if (trimmed.toLowerCase() === 'ventas') return 'Ventas';
  if (trimmed.toLowerCase() === 'clientes') return 'Clientes';
  if (trimmed.toLowerCase() === 'configuración' || trimmed.toLowerCase() === 'configuracion') return 'Configuración';
  if (trimmed.toLowerCase() === 'transacciones') return 'Transacciones';
  if (trimmed.toLowerCase() === 'taller') return 'Taller';
  if (trimmed.toLowerCase() === 'general') return 'General';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

interface GroupedPermissions {
  moduleName: string;
  icon: string;
  items: Array<{
    permiso: Permiso;
    label: string;
  }>;
}

const groupedPermissions = computed<GroupedPermissions[]>(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const groupsMap = new Map<string, GroupedPermissions>();

  // Prioritize well-known group order
  const standardOrder = [
    'Facturación',
    'Ventas',
    'Clientes',
    'Inventario',
    'Compras',
    'Maestros',
    'Transacciones',
    'Taller',
    'Configuración',
    'General',
  ];

  for (const p of permisoStore.permisoList) {
    const mod = normalizeModuleName(p.modulo, p.clavePermiso);
    const label = getLabelForClave(p.clavePermiso, p.descripcion);

    // Filter by query if present
    if (query) {
      const matchKey = p.clavePermiso.toLowerCase().includes(query);
      const matchDesc = (p.descripcion || '').toLowerCase().includes(query);
      const matchLabel = label.toLowerCase().includes(query);
      const matchMod = mod.toLowerCase().includes(query);
      if (!matchKey && !matchDesc && !matchLabel && !matchMod) {
        continue;
      }
    }

    if (!groupsMap.has(mod)) {
      groupsMap.set(mod, {
        moduleName: mod,
        icon: MODULE_ICONS[mod] || '📌',
        items: [],
      });
    }

    groupsMap.get(mod)!.items.push({
      permiso: p,
      label,
    });
  }

  // Sort groups by standardOrder, then alphabetical
  return Array.from(groupsMap.values()).sort((a, b) => {
    const idxA = standardOrder.indexOf(a.moduleName);
    const idxB = standardOrder.indexOf(b.moduleName);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.moduleName.localeCompare(b.moduleName);
  });
});

const totalAvailablePermisos = computed(() => permisoStore.permisoList.length);

function togglePermiso(clave: string): void {
  const index = form.modulosPermitidos.indexOf(clave);
  if (index === -1) {
    form.modulosPermitidos.push(clave);
  } else {
    form.modulosPermitidos.splice(index, 1);
  }
}

function selectAll(): void {
  const allKeys = permisoStore.permisoList.map((p) => p.clavePermiso);
  form.modulosPermitidos = Array.from(new Set([...form.modulosPermitidos, ...allKeys]));
}

function deselectAll(): void {
  form.modulosPermitidos = [];
}

function isGroupFullySelected(items: Array<{ permiso: Permiso }>): boolean {
  if (items.length === 0) return false;
  return items.every((i) => form.modulosPermitidos.includes(i.permiso.clavePermiso));
}

function toggleGroup(items: Array<{ permiso: Permiso }>): void {
  const fullySelected = isGroupFullySelected(items);
  const groupKeys = items.map((i) => i.permiso.clavePermiso);

  if (fullySelected) {
    form.modulosPermitidos = form.modulosPermitidos.filter((k) => !groupKeys.includes(k));
  } else {
    form.modulosPermitidos = Array.from(new Set([...form.modulosPermitidos, ...groupKeys]));
  }
}

function countSelectedInGroup(items: Array<{ permiso: Permiso }>): number {
  return items.filter((i) => form.modulosPermitidos.includes(i.permiso.clavePermiso)).length;
}

function handleSubmit(): void {
  emit('submit', { ...form });
}
</script>

<template>
  <form
    class="grid grid-cols-1 gap-x-6 gap-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2"
    @submit.prevent="handleSubmit"
  >
    <!-- Nombre del Rol -->
    <div class="sm:col-span-2">
      <label for="nombre" class="mb-1 block text-xs font-semibold text-gray-700">
        {{ t('master.roles.form.nombre') }}
      </label>
      <input
        id="nombre"
        v-model="form.nombre"
        type="text"
        required
        placeholder="Ej. Cajero, Vendedor, Supervisor de Ventas..."
        class="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>

    <!-- Descripción del Rol -->
    <div class="sm:col-span-2">
      <label for="descripcion" class="mb-1 block text-xs font-semibold text-gray-700">
        {{ t('master.roles.form.descripcion') }}
      </label>
      <textarea
        id="descripcion"
        v-model="form.descripcion"
        rows="2"
        placeholder="Descripción o propósito de este perfil de acceso..."
        class="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>

    <!-- Rol Activo -->
    <div class="flex items-center gap-2 sm:col-span-2">
      <input
        id="activo"
        v-model="form.activo"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
      />
      <label for="activo" class="cursor-pointer text-sm font-medium text-gray-700 select-none">
        {{ t('master.roles.form.isActive') }}
      </label>
    </div>

    <!-- SECCIÓN DE PERMISOS CONFIGURABLES -->
    <fieldset class="sm:col-span-2 border-t border-gray-100 pt-4">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <legend class="text-sm font-bold text-gray-800">
            {{ t('master.roles.form.modulosPermitidos') }}
          </legend>
          <p class="text-xs text-gray-500 mt-0.5">
            Configura granularmente los módulos, acciones y accesos permitidos para este rol.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            {{ form.modulosPermitidos.length }} de {{ totalAvailablePermisos }} permisos seleccionados
          </span>
          <button
            type="button"
            class="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
            @click="selectAll"
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            class="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
            @click="deselectAll"
          >
            Deseleccionar todos
          </button>
        </div>
      </div>

      <!-- Buscador de permisos en tiempo real -->
      <div class="relative mb-4">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
          🔍
        </span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar permisos por nombre, módulo o descripción..."
          class="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 hover:text-gray-600"
          @click="searchQuery = ''"
        >
          ✕
        </button>
      </div>

      <!-- Spinner si está cargando catálogo de permisos -->
      <div v-if="permisoStore.isLoading" class="flex items-center justify-center py-10 text-gray-400 text-sm">
        <span class="animate-spin mr-2">⏳</span> Cargando catálogo de permisos...
      </div>

      <!-- Estado vacío si el filtro no coincide -->
      <div
        v-else-if="groupedPermissions.length === 0"
        class="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center text-xs text-gray-500"
      >
        No se encontraron permisos que coincidan con la búsqueda.
      </div>

      <!-- Lista de Módulos y Permisos organizados en tarjetas -->
      <div v-else class="space-y-4">
        <div
          v-for="group in groupedPermissions"
          :key="group.moduleName"
          class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition hover:border-gray-300"
        >
          <!-- Encabezado del Módulo -->
          <div class="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
            <div class="flex items-center gap-2">
              <span class="text-base">{{ group.icon }}</span>
              <span class="text-sm font-semibold text-gray-800">{{ group.moduleName }}</span>
              <span class="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                {{ countSelectedInGroup(group.items) }} / {{ group.items.length }}
              </span>
            </div>

            <button
              type="button"
              class="text-xs font-medium text-brand hover:text-brand-hover transition select-none"
              @click="toggleGroup(group.items)"
            >
              {{ isGroupFullySelected(group.items) ? 'Desmarcar módulo' : 'Marcar módulo' }}
            </button>
          </div>

          <!-- Permisos del Módulo -->
          <div class="divide-y divide-gray-100 p-1 sm:grid sm:grid-cols-2 sm:gap-x-4 sm:gap-y-1 sm:divide-y-0 sm:p-3">
            <label
              v-for="item in group.items"
              :key="item.permiso.id"
              :class="[
                'flex cursor-pointer items-start gap-3 rounded-lg p-2.5 transition select-none',
                form.modulosPermitidos.includes(item.permiso.clavePermiso)
                  ? 'bg-brand/5 border border-brand/20'
                  : 'hover:bg-gray-50 border border-transparent',
              ]"
            >
              <input
                type="checkbox"
                :checked="form.modulosPermitidos.includes(item.permiso.clavePermiso)"
                class="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
                @change="togglePermiso(item.permiso.clavePermiso)"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-semibold text-gray-800">{{ item.label }}</span>
                  <code class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                    {{ item.permiso.clavePermiso }}
                  </code>
                </div>
                <p v-if="item.permiso.descripcion" class="mt-0.5 text-[11px] leading-relaxed text-gray-500">
                  {{ item.permiso.descripcion }}
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </fieldset>

    <!-- Mensaje de Error si ocurre -->
    <p
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 sm:col-span-2"
    >
      {{ t(errorMessage) }}
    </p>

    <!-- Botones de Acción -->
    <div class="flex justify-end gap-3 sm:col-span-2 pt-2">
      <RouterLink
        to="/master/roles"
        class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      >
        {{ t('common.cancel') }}
      </RouterLink>
      <button
        type="submit"
        :disabled="isSaving"
        class="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? t('master.roles.form.saving') : submitLabel }}
      </button>
    </div>
  </form>
</template>
