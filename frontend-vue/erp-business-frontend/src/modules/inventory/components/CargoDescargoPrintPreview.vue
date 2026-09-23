<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export interface CargoDescargoPrintData {
  tipo: 'CARGO' | 'DESCARGO';
  documentoNumero: string;
  fecha: string;
  almacenNombre: string;
  clasificacion: string;
  responsable: string;
  autorizadoPor: string;
  proposito: string;
  detalle: string;
  items: Array<{
    codigo: string;
    descripcion: string;
    cantidad: number;
    costoUnitario: number;
    pesoKg: number;
    unidadMedida: string;
  }>;
}

interface Props {
  data: CargoDescargoPrintData;
  companyName?: string;
  companyRif?: string;
  companyAddress?: string;
  companyPhone?: string;
}

const props = withDefaults(defineProps<Props>(), {
  companyName: 'ERP BUSINESS, C.A.',
  companyRif: 'J-12345678-9',
  companyAddress: 'Zona Industrial Unare II, Puerto Ordaz, Estado Bolívar',
  companyPhone: '+58 (286) 950-0000',
});

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

function handlePrint(): void {
  window.print();
}

const totalCosto = computed(() =>
  props.data.items.reduce((sum, i) => sum + i.costoUnitario * i.cantidad, 0),
);

const totalPeso = computed(() =>
  props.data.items.reduce((sum, i) => sum + i.pesoKg * i.cantidad, 0),
);

const totalCantidadItems = computed(() =>
  props.data.items.reduce((sum, i) => sum + i.cantidad, 0),
);
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-xs">
      <div class="mx-auto max-w-3xl">
        <!-- Actions Toolbar (Hidden when printing) -->
        <div class="print:hidden mb-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-md">
          <div class="flex items-center gap-2">
            <span class="flex h-3 w-3 rounded-full" :class="props.data.tipo === 'CARGO' ? 'bg-emerald-500' : 'bg-blue-500'" />
            <span class="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Comprobante de {{ props.data.tipo === 'CARGO' ? 'Cargo' : 'Descargo' }} (#{{ props.data.documentoNumero }})
            </span>
          </div>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-xs font-bold text-gray-700 shadow-xs transition hover:bg-gray-50"
              @click="emit('close')"
            >
              {{ t('common.close') }}
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-brand-hover"
              @click="handlePrint"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span>{{ t('invoices.print.printButton') }}</span>
            </button>
          </div>
        </div>

        <!-- Printable Document Sheet -->
        <div class="cargo-descargo-print-sheet rounded-2xl bg-white p-8 shadow-xl font-sans text-gray-900 border border-gray-200">
          <!-- Header Membrete -->
          <div class="flex flex-wrap items-start justify-between border-b-2 border-gray-900 pb-4">
            <div>
              <h1 class="text-xl font-black tracking-tight text-gray-900 uppercase">{{ companyName }}</h1>
              <p class="text-xs font-bold text-gray-600 font-mono">RIF: {{ companyRif }}</p>
              <p class="text-xs text-gray-500 max-w-sm mt-0.5">{{ companyAddress }}</p>
              <p class="text-xs text-gray-500">Telf: {{ companyPhone }}</p>
            </div>
            <div class="text-right">
              <div
                class="inline-block rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider text-white mb-1 shadow-xs"
                :class="props.data.tipo === 'CARGO' ? 'bg-emerald-700' : 'bg-blue-700'"
              >
                COMPROBANTE DE {{ props.data.tipo }} DE INVENTARIO
              </div>
              <p class="font-mono text-lg font-black text-gray-900">#{{ props.data.documentoNumero }}</p>
              <p class="text-xs text-gray-600 font-medium">Fecha: {{ props.data.fecha }}</p>
            </div>
          </div>

          <!-- Información General y Datos de Totalización -->
          <div class="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 border border-gray-200 text-xs">
            <div>
              <p class="text-gray-500 font-medium">Depósito / Almacén:</p>
              <p class="font-bold text-gray-900 text-sm">{{ props.data.almacenNombre }}</p>
            </div>
            <div>
              <p class="text-gray-500 font-medium">Clasificación de Operación:</p>
              <p class="font-bold text-gray-900">{{ props.data.clasificacion || 'AJUSTE DE EXISTENCIA' }}</p>
            </div>
            <div>
              <p class="text-gray-500 font-medium">Responsable:</p>
              <p class="font-bold text-gray-900">{{ props.data.responsable || 'ADMINISTRACIÓN' }}</p>
            </div>
            <div>
              <p class="text-gray-500 font-medium">Autorizado por:</p>
              <p class="font-bold text-gray-900">{{ props.data.autorizadoPor || 'SUPERVISOR DE ALMACÉN' }}</p>
            </div>
            <div v-if="props.data.proposito" class="col-span-2 border-t border-gray-200 pt-2">
              <p class="text-gray-500 font-medium">Propósito:</p>
              <p class="font-semibold text-gray-800">{{ props.data.proposito }}</p>
            </div>
            <div v-if="props.data.detalle" class="col-span-2 border-t border-gray-200 pt-2">
              <p class="text-gray-500 font-medium">Detalle / Observaciones:</p>
              <p class="font-semibold text-gray-800">{{ props.data.detalle }}</p>
            </div>
          </div>

          <!-- Tabla de Productos -->
          <div class="mt-6">
            <h2 class="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Detalle de Productos</h2>
            <table class="w-full text-left text-xs border border-gray-300">
              <thead>
                <tr class="bg-gray-100 text-gray-800 uppercase font-bold text-[11px]">
                  <th class="border px-2.5 py-1.5">Código</th>
                  <th class="border px-2.5 py-1.5">Descripción</th>
                  <th class="border px-2.5 py-1.5 text-right">Cantidad</th>
                  <th class="border px-2.5 py-1.5 text-right">Costo (u)</th>
                  <th class="border px-2.5 py-1.5 text-right">Costo Total</th>
                  <th class="border px-2.5 py-1.5 text-right">Peso Unit</th>
                  <th class="border px-2.5 py-1.5 text-right">Peso Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in props.data.items" :key="item.codigo" class="border-b border-gray-200">
                  <td class="border px-2.5 py-1.5 font-mono font-bold">{{ item.codigo }}</td>
                  <td class="border px-2.5 py-1.5">{{ item.descripcion }}</td>
                  <td class="border px-2.5 py-1.5 text-right font-mono font-bold">
                    {{ item.cantidad }} {{ item.unidadMedida }}
                  </td>
                  <td class="border px-2.5 py-1.5 text-right font-mono">${{ item.costoUnitario.toFixed(2) }}</td>
                  <td class="border px-2.5 py-1.5 text-right font-mono font-bold">
                    ${{ (item.costoUnitario * item.cantidad).toFixed(2) }}
                  </td>
                  <td class="border px-2.5 py-1.5 text-right font-mono">{{ item.pesoKg.toFixed(2) }} kg</td>
                  <td class="border px-2.5 py-1.5 text-right font-mono font-bold">
                    {{ (item.pesoKg * item.cantidad).toFixed(2) }} kg
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Resumen de Totales -->
          <div class="mt-4 flex justify-between items-center bg-gray-100 p-3 rounded-lg border border-gray-300 text-xs font-bold text-gray-900">
            <div>
              <span>Líneas: <strong class="font-mono">{{ props.data.items.length }}</strong></span>
              <span class="ml-4">Items: <strong class="font-mono">{{ totalCantidadItems }}</strong></span>
            </div>
            <div class="flex items-center gap-6 font-mono">
              <span>TOTAL PESO: <strong class="text-blue-950 text-sm">{{ totalPeso.toFixed(2) }} kg</strong></span>
              <span>TOTAL COSTO: <strong class="text-emerald-800 text-sm">${{ totalCosto.toFixed(2) }}</strong></span>
            </div>
          </div>

          <!-- Firmas de Autorización -->
          <div class="mt-12 grid grid-cols-2 gap-12 text-center text-xs">
            <div>
              <div class="border-t border-gray-400 pt-2 font-bold text-gray-800">
                Elaborado por: {{ props.data.responsable || 'ADMINISTRACIÓN' }}
              </div>
              <p class="text-[10px] text-gray-500 mt-0.5">Firma y Firma Digital</p>
            </div>
            <div>
              <div class="border-t border-gray-400 pt-2 font-bold text-gray-800">
                Autorizado por: {{ props.data.autorizadoPor || 'SUPERVISOR DE ALMACÉN' }}
              </div>
              <p class="text-[10px] text-gray-500 mt-0.5">Firma y Sello Almacén</p>
            </div>
          </div>
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

  .cargo-descargo-print-sheet,
  .cargo-descargo-print-sheet * {
    visibility: visible;
  }

  .cargo-descargo-print-sheet {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    margin: 0;
    padding: 20px;
    box-shadow: none !important;
    border: none !important;
  }
}
</style>
