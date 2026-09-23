<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { usePagination } from '@/composables/usePagination';
import { useInventoryTransformStore } from '../interfaces/inventory-transform.store';
import { useProductStore } from '../interfaces/product.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';
import type { InvTransformacion } from '../interfaces/transformacion.interface';

const { t } = useI18n();
const transformStore = useInventoryTransformStore();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();

const searchTerm = ref<string>('');
const selectedItem = ref<InvTransformacion | null>(null);

const filteredTransformaciones = computed<InvTransformacion[]>(() =>
  transformStore.transformaciones.filter((item) => {
    const term = searchTerm.value.trim().toLowerCase();
    return (
      term === '' ||
      item.numeroDocumento.toLowerCase().includes(term) ||
      (item.depositoOrigenNombre ?? '').toLowerCase().includes(term) ||
      (item.depositoDestinoNombre ?? '').toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredTransformaciones, 10);

watch(searchTerm, () => pagination.resetPage());

onMounted(() => {
  if (productStore.productList.length === 0) {
    productStore.fetchProducts();
  }
  if (warehouseStore.warehouseList.length === 0) {
    warehouseStore.fetchWarehouses();
  }
  transformStore.fetchTransformaciones();
});

function warehouseName(id?: string): string {
  if (!id) return '—';
  return warehouseStore.getWarehouseById(id)?.name ?? `#${id}`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_STYLES: Record<InvTransformacion['estado'], string> = {
  CONFIRMADA: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  ANULADA: 'bg-gray-100 text-gray-500 border border-gray-200',
};
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ t('inventory.transformations.title') }}</h1>
        <p class="text-xs text-gray-500">Historial de transformaciones de inventario y vínculos de doble movimiento</p>
      </div>
      <RouterLink
        to="/inventory/transformations/create"
        class="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover shadow-sm"
      >
        <span>+ {{ t('inventory.transformations.newTransformation') }}</span>
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput
        id="transformations-search"
        v-model="searchTerm"
        :placeholder="t('inventory.transformations.searchPlaceholder')"
      />
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-4 py-3.5 font-medium">{{ t('inventory.transformations.form.code') }}</th>
              <th class="px-4 py-3.5 font-medium">Origen ➔ Destino</th>
              <th class="px-4 py-3.5 text-right font-medium">Costo Consumo</th>
              <th class="px-4 py-3.5 text-right font-medium">Costo Generado</th>
              <th class="px-4 py-3.5 text-right font-medium">Peso (Cons / Gen)</th>
              <th class="px-4 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-4 py-3.5 font-medium">{{ t('inventory.transformations.date') }}</th>
              <th class="px-4 py-3.5 text-center font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in pagination.pageItems.value"
              :key="item.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-4 py-3.5 font-mono font-semibold text-brand">{{ item.numeroDocumento }}</td>
              <td class="px-4 py-3.5 text-gray-700 text-xs">
                <span class="font-medium text-gray-800">{{ item.depositoOrigenNombre || warehouseName(item.depositoOrigenId || item.depositoId) }}</span>
                <span class="text-gray-400 mx-1">➔</span>
                <span class="font-medium text-emerald-800">{{ item.depositoDestinoNombre || warehouseName(item.depositoDestinoId) }}</span>
              </td>
              <td class="px-4 py-3.5 text-right font-mono text-gray-700 text-xs">
                ${{ (item.costoTotalConsumido ?? 0).toFixed(2) }}
              </td>
              <td class="px-4 py-3.5 text-right font-mono text-emerald-700 font-semibold text-xs">
                ${{ (item.costoTotalGenerado ?? 0).toFixed(2) }}
              </td>
              <td class="px-4 py-3.5 text-right font-mono text-gray-600 text-xs">
                {{ (item.pesoTotalConsumidoKg ?? 0).toFixed(2) }} / {{ (item.pesoTotalGeneradoKg ?? 0).toFixed(2) }} kg
              </td>
              <td class="px-4 py-3.5">
                <span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_STYLES[item.estado]]">
                  {{ t(`inventory.transformations.status.${item.estado}`) }}
                </span>
              </td>
              <td class="px-4 py-3.5 text-gray-500 text-xs">{{ formatDate(item.createdAt) }}</td>
              <td class="px-4 py-3.5 text-center">
                <button
                  type="button"
                  class="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
                  @click="selectedItem = item"
                >
                  Ver
                </button>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="8" class="px-5 py-10 text-center text-sm font-semibold text-amber-700 bg-amber-50/30">
                ⚠️ No hay registros disponibles para esta sucursal.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        :page="pagination.page.value"
        :total-pages="pagination.totalPages.value"
        :total-items="pagination.totalItems.value"
        :range-start="pagination.rangeStart.value"
        :range-end="pagination.rangeEnd.value"
        :page-size="pagination.pageSize.value"
        @update:page="pagination.page.value = $event"
        @update:pageSize="pagination.pageSize.value = $event"
      />
    </div>

    <!-- Modal para ver el Detalle de la Transformación -->
    <Teleport to="body">
      <div
        v-if="selectedItem"
        class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4 backdrop-blur-xs"
        @click.self="selectedItem = null"
      >
        <div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div class="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h2 class="text-lg font-bold text-gray-900">Detalle de Transformación: {{ selectedItem.numeroDocumento }}</h2>
              <p class="text-xs text-gray-500">
                Fecha: {{ formatDate(selectedItem.createdAt) }} | Estado: {{ selectedItem.estado }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              @click="selectedItem = null"
            >
              ✕
            </button>
          </div>

          <div class="mt-4 grid gap-6 md:grid-cols-2">
            <!-- Módulo 1: Materiales Consumidos -->
            <div class="rounded-xl border border-blue-200 bg-blue-50/20 p-4">
              <h3 class="mb-1 text-xs font-bold uppercase tracking-wider text-blue-900">
                Módulo 1: Materiales Consumidos (Descargo)
              </h3>
              <p class="mb-3 text-xs text-gray-600">
                Almacén Origen: <span class="font-semibold text-gray-800">{{ selectedItem.depositoOrigenNombre || warehouseName(selectedItem.depositoOrigenId) }}</span>
              </p>
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-blue-200 text-gray-600">
                    <th class="py-1">Código</th>
                    <th class="py-1">Descripción</th>
                    <th class="py-1 text-right">Ctd.</th>
                    <th class="py-1 text-right">Costo</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="(m, i) in (selectedItem.itemsConsumidos || [])" :key="i">
                    <td class="py-1 font-mono text-gray-600">{{ m.codigo }}</td>
                    <td class="py-1 text-gray-800">{{ m.descripcion }}</td>
                    <td class="py-1 text-right font-bold text-gray-900">{{ m.cantidad }}</td>
                    <td class="py-1 text-right font-mono text-gray-700">${{ (m.costoUnitario * m.cantidad).toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="mt-3 border-t border-blue-200 pt-2 text-right text-xs font-bold text-blue-950">
                Total Consumido: ${{ (selectedItem.costoTotalConsumido ?? 0).toFixed(2) }} | Peso: {{ (selectedItem.pesoTotalConsumidoKg ?? 0).toFixed(2) }} kg
              </div>
            </div>

            <!-- Módulo 2: Productos Terminados -->
            <div class="rounded-xl border border-emerald-200 bg-emerald-50/20 p-4">
              <h3 class="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-900">
                Módulo 2: Productos Terminados (Cargo)
              </h3>
              <p class="mb-3 text-xs text-gray-600">
                Almacén Destino: <span class="font-semibold text-gray-800">{{ selectedItem.depositoDestinoNombre || warehouseName(selectedItem.depositoDestinoId) }}</span>
              </p>
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-emerald-200 text-gray-600">
                    <th class="py-1">Código</th>
                    <th class="py-1">Descripción</th>
                    <th class="py-1 text-right">Ctd.</th>
                    <th class="py-1 text-right">Costo</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="(p, i) in ((selectedItem.itemsResultado as any[]) || [])" :key="i">
                    <td class="py-1 font-mono text-gray-600">{{ p.codigo }}</td>
                    <td class="py-1 text-gray-800">{{ p.descripcion }}</td>
                    <td class="py-1 text-right font-bold text-gray-900">{{ p.cantidad }}</td>
                    <td class="py-1 text-right font-mono text-gray-700">${{ ((p.costoUnitario ?? 0) * p.cantidad).toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="mt-3 border-t border-emerald-200 pt-2 text-right text-xs font-bold text-emerald-950">
                Total Generado: ${{ (selectedItem.costoTotalGenerado ?? 0).toFixed(2) }} | Peso: {{ (selectedItem.pesoTotalGeneradoKg ?? 0).toFixed(2) }} kg
              </div>
            </div>
          </div>

          <div v-if="selectedItem.observacion" class="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <span class="font-semibold text-gray-800">Observación:</span> {{ selectedItem.observacion }}
          </div>

          <div class="mt-6 flex justify-end">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              @click="selectedItem = null"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
