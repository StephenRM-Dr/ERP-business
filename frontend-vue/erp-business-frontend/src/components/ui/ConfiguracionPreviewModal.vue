<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePermisoStore } from '@/modules/master/roles/interfaces/permiso.store';
import { flattenModuleCatalog } from '@/config/module-catalog';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  show: boolean;
  title: string;
  subtitle?: string;
  permisos: string[];
  isSuperAdmin?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t, te } = useI18n();
const permisoStore = usePermisoStore();
const searchQuery = ref('');

onMounted(async () => {
  if (permisoStore.permisoList.length === 0) {
    await permisoStore.fetchPermisos();
  }
});

const flatCatalog = computed(() => flattenModuleCatalog());

function getLabelForClave(clave: string, defaultDesc: string): string {
  const match = flatCatalog.value.find((item) => item.id === clave);
  if (match && te(match.labelKey)) {
    return t(match.labelKey);
  }
  return defaultDesc || clave;
}

// Special Capabilities flags
const hasNationalPrice = computed(() => props.isSuperAdmin || props.permisos.includes('invoices.priceNational'));
const hasLocalPrice = computed(() => props.isSuperAdmin || props.permisos.includes('invoices.priceLocal'));
const hasEditPrice = computed(() => props.isSuperAdmin || props.permisos.includes('invoices.editPrice'));
const hasSellWithoutStock = computed(() => props.isSuperAdmin || props.permisos.includes('invoices.sellWithoutStock'));
const hasViewAllLocations = computed(() => props.isSuperAdmin || props.permisos.includes('general.viewAllLocations'));
const hasReturns = computed(() => props.isSuperAdmin || props.permisos.includes('returns'));
const hasCxC = computed(() => props.isSuperAdmin || props.permisos.includes('cuentas.cobrar') || props.permisos.includes('recibos.cobro'));

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

function normalizeModuleName(mod: string): string {
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

const activePermisosList = computed(() => {
  if (props.isSuperAdmin) {
    return permisoStore.permisoList;
  }
  return permisoStore.permisoList.filter((p) => props.permisos.includes(p.clavePermiso));
});

const groupedActivePermisos = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const map = new Map<string, Array<{ clave: string; label: string; descripcion: string }>>();

  for (const p of activePermisosList.value) {
    const mod = normalizeModuleName(p.modulo);
    const label = getLabelForClave(p.clavePermiso, p.descripcion);

    if (query) {
      const matchKey = p.clavePermiso.toLowerCase().includes(query);
      const matchDesc = (p.descripcion || '').toLowerCase().includes(query);
      const matchLabel = label.toLowerCase().includes(query);
      const matchMod = mod.toLowerCase().includes(query);
      if (!matchKey && !matchDesc && !matchLabel && !matchMod) continue;
    }

    if (!map.has(mod)) {
      map.set(mod, []);
    }
    map.get(mod)!.push({
      clave: p.clavePermiso,
      label,
      descripcion: p.descripcion,
    });
  }

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

  return Array.from(map.entries())
    .map(([moduleName, items]) => ({
      moduleName,
      icon: MODULE_ICONS[moduleName] || '📌',
      items,
    }))
    .sort((a, b) => {
      const idxA = standardOrder.indexOf(a.moduleName);
      const idxB = standardOrder.indexOf(b.moduleName);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.moduleName.localeCompare(b.moduleName);
    });
});
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-xs"
    @click.self="emit('close')"
  >
    <div
      class="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
    >
      <!-- Modal Header -->
      <div class="flex items-start justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-gray-800">{{ title }}</h2>
            <span
              v-if="isSuperAdmin"
              class="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700"
            >
              Super Administrador (Acceso Total)
            </span>
          </div>
          <p v-if="subtitle" class="text-xs text-gray-500 mt-0.5">{{ subtitle }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-5">
        <!-- Highlights Bar / Tarjetas de Capacidades Críticas -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Resumen de Capacidades y Tarifas
          </h3>
          <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <!-- Total Permisos -->
            <div class="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <span class="block text-xl font-bold text-brand">
                {{ isSuperAdmin ? permisoStore.permisoList.length : permisos.length }}
              </span>
              <span class="block text-[11px] font-medium text-gray-500">Permisos Activos</span>
            </div>

            <!-- Tarifa Permitida -->
            <div class="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <span
                :class="[
                  'block text-xs font-bold mt-1',
                  hasNationalPrice ? 'text-blue-600' : hasLocalPrice ? 'text-emerald-600' : 'text-gray-400',
                ]"
              >
                {{ hasNationalPrice ? 'Tarifa Nacional' : hasLocalPrice ? 'Tarifa Local' : 'Sin Tarifa' }}
              </span>
              <span class="block text-[11px] font-medium text-gray-500 mt-1">Tarifa Facturación</span>
            </div>

            <!-- Sucursales -->
            <div class="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <span
                :class="[
                  'block text-xs font-bold mt-1',
                  hasViewAllLocations ? 'text-indigo-600' : 'text-slate-600',
                ]"
              >
                {{ hasViewAllLocations ? 'Todas (Nacional)' : 'Solo Propia' }}
              </span>
              <span class="block text-[11px] font-medium text-gray-500 mt-1">Alcance Sucursal</span>
            </div>

            <!-- Venta sin stock / Precio -->
            <div class="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <span
                :class="[
                  'block text-xs font-bold mt-1',
                  hasSellWithoutStock ? 'text-amber-600' : 'text-gray-500',
                ]"
              >
                {{ hasSellWithoutStock ? 'Permitida' : 'Restringida' }}
              </span>
              <span class="block text-[11px] font-medium text-gray-500 mt-1">Venta sin Stock</span>
            </div>
          </div>
        </div>

        <!-- Facultades adicionales (chips) -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span
            :class="[
              'rounded-full px-2.5 py-1 text-[11px] font-semibold border',
              hasEditPrice
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60',
            ]"
          >
            {{ hasEditPrice ? '✓ Puede modificar precios unitarios' : '✗ No puede modificar precios' }}
          </span>
          <span
            :class="[
              'rounded-full px-2.5 py-1 text-[11px] font-semibold border',
              hasReturns
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60',
            ]"
          >
            {{ hasReturns ? '✓ Gestión de Devoluciones' : '✗ Sin Devoluciones' }}
          </span>
          <span
            :class="[
              'rounded-full px-2.5 py-1 text-[11px] font-semibold border',
              hasCxC
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60',
            ]"
          >
            {{ hasCxC ? '✓ Cuentas x Cobrar y Recibos' : '✗ Sin Cobranzas' }}
          </span>
        </div>

        <!-- Buscador dentro del modal -->
        <div class="relative">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
            🔍
          </span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar entre los permisos asignados..."
            class="w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-9 pr-4 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <!-- Lista de Permisos Agrupados -->
        <div v-if="groupedActivePermisos.length === 0" class="py-8 text-center text-xs text-gray-400">
          No hay permisos asignados que coincidan con la búsqueda.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="group in groupedActivePermisos"
            :key="group.moduleName"
            class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs"
          >
            <div class="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-4 py-2">
              <div class="flex items-center gap-2">
                <span class="text-sm">{{ group.icon }}</span>
                <span class="text-xs font-bold text-gray-800">{{ group.moduleName }}</span>
              </div>
              <span class="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                {{ group.items.length }} permisos
              </span>
            </div>

            <div class="divide-y divide-gray-100 p-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:divide-y-0">
              <div
                v-for="item in group.items"
                :key="item.clave"
                class="rounded-lg border border-gray-100 bg-gray-50/30 p-2"
              >
                <div class="flex items-center justify-between gap-1">
                  <span class="text-xs font-semibold text-gray-800">{{ item.label }}</span>
                  <code class="rounded bg-gray-200/60 px-1 py-0.5 font-mono text-[9px] text-gray-600">
                    {{ item.clave }}
                  </code>
                </div>
                <p v-if="item.descripcion" class="mt-0.5 text-[11px] leading-relaxed text-gray-500">
                  {{ item.descripcion }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-end border-t border-gray-100 bg-gray-50/80 px-6 py-3">
        <button
          type="button"
          class="rounded-lg bg-gray-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-700"
          @click="emit('close')"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>
