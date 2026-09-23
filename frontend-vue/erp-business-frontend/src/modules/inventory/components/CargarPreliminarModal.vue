<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { InventarioPreliminarSummary, TipoPreliminarInventario } from '../interfaces/inventario-preliminar.interface';
import { useInventoryTransformStore } from '../interfaces/inventory-transform.store';

interface Props {
  filtroTipo?: TipoPreliminarInventario | 'TODOS';
}

const props = withDefaults(defineProps<Props>(), {
  filtroTipo: 'TODOS',
});

const emit = defineEmits<{
  close: [];
  select: [preliminar: InventarioPreliminarSummary];
}>();

const { t } = useI18n();
const transformStore = useInventoryTransformStore();

const searchTerm = ref<string>('');
const isDeletingId = ref<number | null>(null);

onMounted(async () => {
  await transformStore.fetchPreliminares();
});

const preliminaresFiltrados = computed(() => {
  return transformStore.preliminares.filter((item) => {
    const matchesType = props.filtroTipo === 'TODOS' || item.tipo === props.filtroTipo;
    const term = searchTerm.value.trim().toLowerCase();
    const matchesTerm =
      term === '' ||
      item.numeroDocumento.toLowerCase().includes(term) ||
      item.etiqueta.toLowerCase().includes(term);
    return matchesType && matchesTerm;
  });
});

async function handleDelete(id: number): Promise<void> {
  if (isDeletingId.value !== null) return;
  isDeletingId.value = id;
  try {
    await transformStore.eliminarPreliminar(id);
  } finally {
    isDeletingId.value = null;
  }
}

function handleSelect(item: InventarioPreliminarSummary): void {
  emit('select', item);
  emit('close');
}

function formatFecha(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
}

function getTipoBadgeClass(tipo: TipoPreliminarInventario): string {
  switch (tipo) {
    case 'INV_CARGO':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'INV_DESCARGO':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'INV_TRANSFORMACION':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'INV_AJUSTE':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4 backdrop-blur-xs font-sans text-gray-800"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
        <!-- Header Modal -->
        <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
          <h2 class="text-base font-bold text-gray-900 flex items-center gap-2">
            <span class="text-lg">📥</span>
            <span>Cargar Borrador / Preliminar de Inventario</span>
          </h2>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 font-bold text-lg"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>

        <!-- Buscador -->
        <div class="mb-3">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="🔍 Buscar preliminar por número de documento o notas..."
            class="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-brand focus:ring-1"
          />
        </div>

        <!-- Tabla de Preliminares -->
        <div class="max-h-80 overflow-y-auto rounded-xl border border-gray-200">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 bg-gray-100 font-bold text-gray-700">
              <tr>
                <th class="px-3 py-2 border-b">Documento #</th>
                <th class="px-3 py-2 border-b">Tipo</th>
                <th class="px-3 py-2 border-b">Fecha Creación</th>
                <th class="px-3 py-2 border-b">Etiqueta / Nota</th>
                <th class="px-3 py-2 border-b text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="item in preliminaresFiltrados"
                :key="item.id"
                class="hover:bg-brand-50/20 transition cursor-pointer"
                @click="handleSelect(item)"
              >
                <td class="px-3 py-2.5 font-mono font-bold text-brand">#{{ item.numeroDocumento }}</td>
                <td class="px-3 py-2.5 whitespace-nowrap">
                  <span
                    class="inline-block rounded-md px-2 py-0.5 text-[10px] border font-bold"
                    :class="getTipoBadgeClass(item.tipo)"
                  >
                    {{ item.tipo }}
                  </span>
                </td>
                <td class="px-3 py-2.5 font-mono text-gray-600 whitespace-nowrap">{{ formatFecha(item.fechaCreacion) }}</td>
                <td class="px-3 py-2.5 text-gray-800 max-w-xs truncate font-medium" :title="item.etiqueta">
                  {{ item.etiqueta || 'Sin notas' }}
                </td>
                <td class="px-3 py-2.5 text-center whitespace-nowrap" @click.stop>
                  <div class="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      class="rounded bg-brand px-3 py-1 text-xs font-bold text-white shadow transition hover:bg-brand-hover"
                      @click="handleSelect(item)"
                    >
                      📥 Cargar
                    </button>
                    <button
                      type="button"
                      title="Eliminar borrador"
                      class="text-red-500 hover:text-red-700 font-bold px-1"
                      @click="handleDelete(item.id)"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="preliminaresFiltrados.length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-xs text-gray-400">
                  No hay documentos preliminares / borradores guardados para esta categoría.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
            @click="emit('close')"
          >
            {{ t('common.close') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
