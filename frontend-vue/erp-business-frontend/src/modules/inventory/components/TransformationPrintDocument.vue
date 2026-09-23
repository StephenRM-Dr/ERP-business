<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ItemResultado, ItemTransformacionDoble } from '../interfaces/transformacion.interface';
import { useProductStore } from '../interfaces/product.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';

interface CompanyInfo {
  nombre: string;
  rif: string;
  direccionFiscal: string;
  telefono: string;
  email: string;
  sucursalNombre: string;
}

/** Datos para imprimir la transformación */
export interface TransformationPrintData {
  numeroDocumento: string;
  descargoDocumento?: string | null;
  cargoDocumento?: string | null;
  productoOrigenId?: string;
  cantidadOrigen?: number;
  depositoId?: string;
  depositoOrigenId?: string;
  depositoDestinoId?: string;
  observacion: string | null;
  itemsConsumidos?: ItemTransformacionDoble[];
  itemsResultado?: ItemResultado[] | ItemTransformacionDoble[];
  createdAt: string;
}

interface TransformationPrintDocumentProps {
  transformation: TransformationPrintData;
  company?: CompanyInfo | null;
  /** Modo preliminar: todavía no se confirmó, así que no hay número de documento — solo la leyenda PRELIMINAR. */
  preliminary?: boolean;
}

const props = defineProps<TransformationPrintDocumentProps>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();

const originProduct = computed(() => {
  if (!props.transformation.productoOrigenId) return null;
  const product = productStore.getProductById(props.transformation.productoOrigenId);
  return { sku: product?.codigo ?? '', name: product?.nombre ?? props.transformation.productoOrigenId };
});

function warehouseName(id?: string): string {
  if (!id) return '—';
  return warehouseStore.getWarehouseById(id)?.name ?? `#${id}`;
}

function productLabel(id: string): { sku: string; name: string } {
  const product = productStore.getProductById(id);
  return { sku: product?.codigo ?? '', name: product?.nombre ?? id };
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' });
}

function handlePrint(): void {
  window.print();
}
</script>

<template>
  <Teleport to="body">
    <div class="invoice-print-overlay fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8">
      <div class="mx-auto max-w-3xl">
        <div class="print:hidden mb-4 flex items-center justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
            @click="emit('close')"
          >
            {{ t('common.close') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
            @click="handlePrint"
          >
            {{ t('invoices.print.printButton') }}
          </button>
        </div>

        <div class="invoice-print-sheet rounded-xl bg-white p-8 shadow-xl">
          <header class="mb-6 flex items-start justify-between border-b border-gray-200 pb-4">
            <div>
              <h1 class="text-lg font-bold text-gray-900">{{ props.company?.nombre ?? 'ERP BUSINESS' }}</h1>
              <p v-if="props.company?.sucursalNombre" class="text-xs text-gray-500">
                {{ props.company.sucursalNombre }}
              </p>
            </div>
            <div class="text-right">
              <h2
                class="text-base font-bold uppercase tracking-wide"
                :class="props.preliminary ? 'text-amber-600' : 'text-brand'"
              >
                {{ props.preliminary ? t('preliminares.legend') : t('inventory.transformations.print.title') }}
              </h2>
              <p v-if="props.preliminary" class="text-xs text-gray-500">
                {{ t('inventory.transformations.print.title') }}
              </p>
              <p v-else class="text-sm font-semibold text-gray-800">
                <span>{{ props.transformation.numeroDocumento }}</span>
                <span
                  v-if="props.transformation.descargoDocumento || props.transformation.cargoDocumento"
                  class="ml-1 text-xs font-normal text-gray-600"
                >
                  ({{ props.transformation.descargoDocumento ?? '—' }} / {{ props.transformation.cargoDocumento ?? '—' }})
                </span>
              </p>
              <p class="text-xs text-gray-500">{{ formatDate(props.transformation.createdAt) }}</p>
            </div>
          </header>

          <!-- Si es transformación simple tradicional -->
          <section v-if="originProduct" class="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
                {{ t('inventory.transformations.form.product') }}
              </p>
              <p class="font-semibold text-gray-800">
                <span class="font-mono text-gray-500">{{ originProduct.sku }}</span> {{ originProduct.name }}
              </p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
                {{ t('inventory.transformations.form.warehouse') }}
              </p>
              <p class="font-semibold text-gray-800">{{ warehouseName(props.transformation.depositoId) }}</p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
                {{ t('inventory.transformations.form.quantity') }}
              </p>
              <p class="font-semibold text-gray-800">{{ props.transformation.cantidadOrigen }}</p>
            </div>
          </section>

          <!-- Si es transformación doble: Módulo 1 (Materiales Consumidos / Descargo) -->
          <div v-if="props.transformation.itemsConsumidos && props.transformation.itemsConsumidos.length > 0" class="mb-6">
            <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-gray-700">
              Módulo 1: Entrada - Materiales Consumidos (Descargo {{ props.transformation.descargoDocumento ? `[${props.transformation.descargoDocumento}]` : '' }})
              <span class="font-normal text-gray-500"> — Almacén: {{ warehouseName(props.transformation.depositoOrigenId) }}</span>
            </h3>
            <table class="w-full text-sm border-b border-gray-200">
              <thead>
                <tr class="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th class="py-1.5">{{ t('inventory.products.form.codigo') }}</th>
                  <th class="py-1.5">{{ t('inventory.products.form.name') }}</th>
                  <th class="py-1.5 text-right">Costo (u)</th>
                  <th class="py-1.5 text-right">Peso (kg)</th>
                  <th class="py-1.5 text-right">{{ t('inventory.transformations.form.quantity') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in props.transformation.itemsConsumidos"
                  :key="index"
                  class="border-b border-gray-100"
                >
                  <td class="py-1.5 font-mono text-gray-600">{{ item.codigo }}</td>
                  <td class="py-1.5 text-gray-800">{{ item.descripcion }}</td>
                  <td class="py-1.5 text-right font-mono text-gray-600">${{ item.costoUnitario.toFixed(2) }}</td>
                  <td class="py-1.5 text-right font-mono text-gray-600">{{ item.pesoKg.toFixed(2) }}</td>
                  <td class="py-1.5 text-right font-bold text-gray-800">{{ item.cantidad }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Módulo 2 (Productos Terminados / Cargo) -->
          <div class="mb-6">
            <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-gray-700">
              Módulo 2: Salida - Productos Terminados (Cargo {{ props.transformation.cargoDocumento ? `[${props.transformation.cargoDocumento}]` : '' }})
              <span v-if="props.transformation.depositoDestinoId" class="font-normal text-gray-500"> — Almacén: {{ warehouseName(props.transformation.depositoDestinoId) }}</span>
            </h3>
            <table class="w-full text-sm border-b border-gray-200">
              <thead>
                <tr class="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th class="py-1.5">{{ t('inventory.products.form.codigo') }}</th>
                  <th class="py-1.5">{{ t('inventory.products.form.name') }}</th>
                  <th v-if="!props.transformation.itemsConsumidos" class="py-1.5">{{ t('inventory.transformations.form.warehouse') }}</th>
                  <th class="py-1.5 text-right">Costo (u)</th>
                  <th class="py-1.5 text-right">Peso (kg)</th>
                  <th class="py-1.5 text-right">{{ t('inventory.transformations.form.quantity') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in (props.transformation.itemsResultado || [])"
                  :key="index"
                  class="border-b border-gray-100"
                >
                  <td class="py-1.5 font-mono text-gray-600">{{ (item as any).codigo || productLabel((item as any).productoId).sku }}</td>
                  <td class="py-1.5 text-gray-800">{{ (item as any).descripcion || productLabel((item as any).productoId).name }}</td>
                  <td v-if="!props.transformation.itemsConsumidos" class="py-1.5 text-gray-600">{{ warehouseName((item as any).depositoId) }}</td>
                  <td class="py-1.5 text-right font-mono text-gray-600">${{ ((item as any).costoUnitario ?? 0).toFixed(2) }}</td>
                  <td class="py-1.5 text-right font-mono text-gray-600">{{ ((item as any).pesoKg ?? 0).toFixed(2) }}</td>
                  <td class="py-1.5 text-right font-bold text-gray-800">{{ item.cantidad }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <section v-if="props.transformation.observacion" class="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {{ t('inventory.transformations.form.notes') }}
            </p>
            <p class="mt-1 text-sm text-amber-700">{{ props.transformation.observacion }}</p>
          </section>

          <p
            v-if="props.preliminary"
            class="mt-6 border-t border-amber-200 pt-4 text-xs font-medium text-amber-700"
          >
            {{ t('inventory.transformations.print.preliminaryNote') }}
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
@media print {
  body * {
    visibility: hidden;
  }

  .invoice-print-overlay,
  .invoice-print-overlay * {
    visibility: visible;
  }

  .invoice-print-overlay {
    position: absolute;
    inset: 0;
    background: white;
    padding: 0;
  }

  .invoice-print-sheet {
    box-shadow: none;
    border-radius: 0;
  }
}
</style>
