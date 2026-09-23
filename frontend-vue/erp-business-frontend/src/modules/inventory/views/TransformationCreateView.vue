<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue';
import { resolveApiErrorMessage } from '@/utils/api-error';
import ProductSearchSelect from '../components/ProductSearchSelect.vue';
import CargarPreliminarModal from '../components/CargarPreliminarModal.vue';
import type { InventarioPreliminarSummary } from '../interfaces/inventario-preliminar.interface';
import type { ItemTransformacionDoble } from '../interfaces/transformacion.interface';
import { useInventoryTransformStore } from '../interfaces/inventory-transform.store';
import { useProductStore } from '../interfaces/product.store';
import { useStockStore } from '../interfaces/stock.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';

const { t } = useI18n();
const router = useRouter();
const transformStore = useInventoryTransformStore();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();
const stockStore = useStockStore();

onMounted(async () => {
  if (productStore.productList.length === 0) {
    await productStore.fetchProducts();
  }
  if (warehouseStore.warehouseList.length === 0) {
    await warehouseStore.fetchWarehouses();
  }
  if (stockStore.stockList.length === 0) {
    await stockStore.fetchStock();
  }
});

// --- Estado de Depósito Único (El Descargo y el Cargo van al MISMO almacén) ---
const depositoId = ref<string>('');
const observacion = ref<string>('');

const selectedWarehouseName = computed<string>(() => {
  if (!depositoId.value) return 'Seleccione un almacén arriba';
  const w = warehouseStore.getWarehouseById(depositoId.value);
  return w ? `[${w.codigo}] ${w.name}` : `#${depositoId.value}`;
});

function getProductStock(productId: string): number {
  if (!productId) return 0;
  if (depositoId.value) {
    return stockStore.getStockItem(productId, depositoId.value)?.quantity ?? 0;
  }
  return stockStore.stockList
    .filter((s) => String(s.productId) === String(productId))
    .reduce((sum, s) => sum + s.quantity, 0);
}

// --- Listas de ítems en proceso (Módulo 1) y a generar (Módulo 2) ---
const materialesEnProceso = ref<ItemTransformacionDoble[]>([]);
const productosAGenerar = ref<ItemTransformacionDoble[]>([]);

// --- Formulario de captura Módulo 1 (Materiales a Consumir / Descargo) ---
const formMod1 = reactive({
  productoId: '',
  codigo: '',
  descripcion: '',
  costoUnitario: 0,
  pesoKg: 0,
  cantidad: 1,
  unidadMedida: 'pza',
});

// --- Formulario de captura Módulo 2 (Productos Terminados / Cargo) ---
const formMod2 = reactive({
  productoId: '',
  codigo: '',
  descripcion: '',
  costoUnitario: 0,
  pesoKg: 0,
  cantidad: 1,
  unidadMedida: 'ud',
});

// Autocompletar datos al seleccionar producto en Módulo 1
function onSelectProductMod1(id: string): void {
  if (!id) {
    clearFormMod1();
    return;
  }
  const prod = productStore.getProductById(id);
  if (!prod) return;
  formMod1.productoId = prod.id;
  formMod1.codigo = prod.codigo;
  formMod1.descripcion = prod.nombre;
  formMod1.costoUnitario = Number(prod.precioCosto || 0);
  formMod1.pesoKg = Number(prod.pesoKg || 0);
  formMod1.unidadMedida = prod.unidadMedida || 'pza';
}

function clearFormMod1(): void {
  formMod1.productoId = '';
  formMod1.codigo = '';
  formMod1.descripcion = '';
  formMod1.costoUnitario = 0;
  formMod1.pesoKg = 0;
  formMod1.cantidad = 1;
  formMod1.unidadMedida = 'pza';
}

function incluirMaterialMod1(): void {
  if (!formMod1.productoId || formMod1.cantidad <= 0) return;

  const existente = materialesEnProceso.value.find((m) => m.productoId === formMod1.productoId);
  if (existente) {
    existente.cantidad += Number(formMod1.cantidad);
    existente.costoUnitario = Number(formMod1.costoUnitario);
    existente.pesoKg = Number(formMod1.pesoKg);
  } else {
    materialesEnProceso.value.push({
      productoId: formMod1.productoId,
      codigo: formMod1.codigo,
      descripcion: formMod1.descripcion,
      cantidad: Number(formMod1.cantidad),
      costoUnitario: Number(formMod1.costoUnitario),
      pesoKg: Number(formMod1.pesoKg),
      unidadMedida: formMod1.unidadMedida,
    });
  }
  clearFormMod1();
}

function removerMaterialMod1(index: number): void {
  materialesEnProceso.value.splice(index, 1);
}

// Autocompletar datos al seleccionar producto en Módulo 2
function onSelectProductMod2(id: string): void {
  if (!id) {
    clearFormMod2();
    return;
  }
  const prod = productStore.getProductById(id);
  if (!prod) return;
  formMod2.productoId = prod.id;
  formMod2.codigo = prod.codigo;
  formMod2.descripcion = prod.nombre;
  formMod2.costoUnitario = Number(prod.precioCosto || 0);
  formMod2.pesoKg = Number(prod.pesoKg || 0);
  formMod2.unidadMedida = prod.unidadMedida || 'ud';
}

function clearFormMod2(): void {
  formMod2.productoId = '';
  formMod2.codigo = '';
  formMod2.descripcion = '';
  formMod2.costoUnitario = 0;
  formMod2.pesoKg = 0;
  formMod2.cantidad = 1;
  formMod2.unidadMedida = 'ud';
}

function incluirProductoMod2(): void {
  if (!formMod2.productoId || formMod2.cantidad <= 0) return;

  const existente = productosAGenerar.value.find((p) => p.productoId === formMod2.productoId);
  if (existente) {
    existente.cantidad += Number(formMod2.cantidad);
    existente.costoUnitario = Number(formMod2.costoUnitario);
    existente.pesoKg = Number(formMod2.pesoKg);
  } else {
    productosAGenerar.value.push({
      productoId: formMod2.productoId,
      codigo: formMod2.codigo,
      descripcion: formMod2.descripcion,
      cantidad: Number(formMod2.cantidad),
      costoUnitario: Number(formMod2.costoUnitario),
      pesoKg: Number(formMod2.pesoKg),
      unidadMedida: formMod2.unidadMedida,
    });
  }
  clearFormMod2();
}

function removerProductoMod2(index: number): void {
  productosAGenerar.value.splice(index, 1);
}

// --- Cálculos de Totales y Diferenciales ---
const totalCostoMod1 = computed<number>(() =>
  materialesEnProceso.value.reduce((sum, item) => sum + item.costoUnitario * item.cantidad, 0),
);

const totalPesoMod1 = computed<number>(() =>
  materialesEnProceso.value.reduce((sum, item) => sum + item.pesoKg * item.cantidad, 0),
);

const totalCostoMod2 = computed<number>(() =>
  productosAGenerar.value.reduce((sum, item) => sum + item.costoUnitario * item.cantidad, 0),
);

const totalPesoMod2 = computed<number>(() =>
  productosAGenerar.value.reduce((sum, item) => sum + item.pesoKg * item.cantidad, 0),
);

const diferenciaCosto = computed<number>(() => totalCostoMod2.value - totalCostoMod1.value);
const diferenciaPeso = computed<number>(() => totalPesoMod2.value - totalPesoMod1.value);

// --- Validaciones y Envío ---
const canSubmit = computed<boolean>(
  () =>
    depositoId.value !== '' &&
    observacion.value.trim() !== '' &&
    materialesEnProceso.value.length > 0 &&
    productosAGenerar.value.length > 0,
);

const showConfirmModal = ref<boolean>(false);
const showCargarPreliminarModal = ref<boolean>(false);
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string>('');
const numeroDocumentoExito = ref<string | null>(null);

async function onSelectPreliminar(summary: InventarioPreliminarSummary): Promise<void> {
  errorMessage.value = '';
  try {
    const detalle = await transformStore.fetchPreliminarDetalle(summary.id);
    if (detalle.payload) {
      if (detalle.payload.depositoId) {
        depositoId.value = String(detalle.payload.depositoId);
      }
      observacion.value = summary.etiqueta || '';
      materialesEnProceso.value = (detalle.payload.materialesInsumos || detalle.payload.items || []).map((it: any) => {
        const pId = String(it.productoId ?? it.producto_id);
        const prod = productStore.getProductById(pId);
        return {
          productoId: pId,
          codigo: prod?.codigo ?? `#${pId}`,
          descripcion: prod?.nombre ?? 'Producto',
          cantidad: Number(it.cantidad),
          costoUnitario: Number(prod?.precioCosto || 0),
          pesoKg: Number(prod?.pesoKg || 0),
          unidadMedida: prod?.unidadMedida || 'pza',
        };
      });
      productosAGenerar.value = (detalle.payload.productosTerminados || []).map((it: any) => {
        const pId = String(it.productoId ?? it.producto_id);
        const prod = productStore.getProductById(pId);
        return {
          productoId: pId,
          codigo: prod?.codigo ?? `#${pId}`,
          descripcion: prod?.nombre ?? 'Producto',
          cantidad: Number(it.cantidad),
          costoUnitario: Number(prod?.precioCosto || 0),
          pesoKg: Number(prod?.pesoKg || 0),
          unidadMedida: prod?.unidadMedida || 'ud',
        };
      });
    }
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, 'Error cargando preliminar de transformación.');
  }
}

async function ejecutarTransformacion(): Promise<void> {
  if (!canSubmit.value) return;
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    const res = await transformStore.ejecutarTransformacionDoble({
      depositoOrigenId: depositoId.value,
      depositoDestinoId: depositoId.value,
      observacion: observacion.value,
      materialesConsumir: materialesEnProceso.value,
      productosGenerar: productosAGenerar.value,
    });
    numeroDocumentoExito.value = res.numeroDocumento;
    showConfirmModal.value = false;
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, 'Error ejecutando la transformación.');
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm(): void {
  depositoId.value = '';
  observacion.value = '';
  materialesEnProceso.value = [];
  productosAGenerar.value = [];
  clearFormMod1();
  clearFormMod2();
  numeroDocumentoExito.value = null;
  errorMessage.value = '';
}
</script>

<template>
  <div class="mx-auto max-w-[1400px] p-4 font-sans text-gray-800">
    <!-- Header de la Pantalla -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-white shadow">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-gray-900">Transformación de Inventario</h1>
          <p class="text-xs text-gray-500">Módulo interactivo de doble movimiento: Descargo y Cargo ejecutados en el mismo almacén</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-brand bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand shadow-xs transition hover:bg-brand-100"
          @click="showCargarPreliminarModal = true"
        >
          <span>📥 Cargar Preliminar</span>
        </button>
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          @click="router.push('/inventory/transformations')"
        >
          {{ t('inventory.transformations.viewHistory') }}
        </button>
      </div>
    </div>

    <!-- Mensaje de Éxito tras Confirmar -->
    <div
      v-if="numeroDocumentoExito"
      class="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-6 shadow-sm backdrop-blur-sm"
    >
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-emerald-900">¡Transformación completada exitosamente!</h2>
          <p class="text-sm text-emerald-700">
            Se generó el documento de transformación <span class="font-mono font-bold">{{ numeroDocumentoExito }}</span>. Se aplicó el Descargo de insumos y el Cargo de productos terminados en el almacén <span class="font-semibold">{{ selectedWarehouseName }}</span>.
          </p>
        </div>
      </div>
      <div class="mt-4 flex gap-3">
        <button
          type="button"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-emerald-700"
          @click="resetForm"
        >
          Nueva Transformación
        </button>
        <button
          type="button"
          class="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
          @click="router.push('/inventory/transformations')"
        >
          Ver Historial de Transformaciones
        </button>
      </div>
    </div>

    <!-- Error Global -->
    <div
      v-if="errorMessage"
      class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm"
    >
      {{ errorMessage }}
    </div>

    <!-- Selector Unificado de Almacén (El Descargo y el Cargo van al MISMO almacén) -->
    <div v-if="!numeroDocumentoExito" class="mb-5 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm backdrop-blur-xs">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider text-blue-950">
              Almacén de la Transformación
            </label>
            <p class="text-[11px] text-blue-700">
              Tanto el Descargo (salida de materiales) como el Cargo (ingreso de productos) se ejecutan en este mismo almacén.
            </p>
          </div>
        </div>
        <div class="w-full sm:w-96">
          <select
            v-model="depositoId"
            class="w-full rounded-xl border border-blue-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
          >
            <option value="" disabled>Seleccione el almacén donde se realiza la transformación...</option>
            <option
              v-for="w in warehouseStore.sortedWarehouses"
              :key="w.id"
              :value="w.id"
            >
              [{{ w.codigo }}] {{ w.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Vista Principal de Dos Columnas (Módulo 1 y Módulo 2) -->
    <div v-if="!numeroDocumentoExito" class="grid gap-6 lg:grid-cols-2">
      <!-- ==================================================================== -->
      <!-- MÓDULO 1: ENTRADA - MATERIALES A CONSUMIR (DESCARGO) -->
      <!-- ==================================================================== -->
      <div class="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <!-- Título Módulo 1 -->
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-gray-900">Módulo 1: Entrada - Materiales a Consumir</h2>
            <span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">Descargo</span>
          </div>
          <p class="mt-1 text-xs text-gray-500">
            Almacén: <span class="font-semibold text-blue-950">{{ selectedWarehouseName }}</span>
          </p>
        </div>

        <!-- Tabla: Materiales en Proceso -->
        <div class="mb-1 rounded-t-lg bg-blue-100/70 px-3 py-1.5 text-center text-xs font-bold text-blue-950 border border-blue-200/80">
          Materiales en Proceso
        </div>
        <div class="min-h-[220px] max-h-[300px] overflow-y-auto rounded-b-lg border border-gray-200 bg-white">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 bg-gray-100/90 text-gray-700 shadow-sm backdrop-blur-xs">
              <tr>
                <th class="border-b border-gray-200 px-2 py-1.5 font-semibold">Código</th>
                <th class="border-b border-gray-200 px-2 py-1.5 font-semibold">Descripción</th>
                <th class="border-b border-gray-200 px-2 py-1.5 text-right font-semibold">Costo (u)</th>
                <th class="border-b border-gray-200 px-2 py-1.5 text-right font-semibold">Peso (kg/u)</th>
                <th class="border-b border-gray-200 px-2 py-1.5 text-right font-semibold">Ctd.</th>
                <th class="border-b border-gray-200 px-2 py-1.5 text-center font-semibold"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(item, idx) in materialesEnProceso"
                :key="item.productoId"
                class="hover:bg-blue-50/40 transition"
              >
                <td class="px-2 py-1.5 font-mono text-gray-700">{{ item.codigo }}</td>
                <td class="px-2 py-1.5 text-gray-800">{{ item.descripcion }}</td>
                <td class="px-2 py-1.5 text-right text-gray-700 font-mono">{{ item.costoUnitario.toFixed(2) }}</td>
                <td class="px-2 py-1.5 text-right text-gray-700 font-mono">{{ item.pesoKg.toFixed(2) }}</td>
                <td class="px-2 py-1.5 text-right font-semibold text-gray-900 font-mono">{{ item.cantidad }}</td>
                <td class="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    title="Eliminar fila"
                    class="text-red-500 hover:text-red-700"
                    @click="removerMaterialMod1(idx)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="materialesEnProceso.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-xs text-gray-400">
                  No hay materiales agregados para consumir.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Barra de Totales Módulo 1 -->
        <div class="mt-2 flex items-center justify-between rounded-lg bg-gray-100 px-4 py-2 text-xs font-bold text-gray-800 border border-gray-200">
          <span>Totales Módulo 1</span>
          <span class="font-mono text-brand">
            Costo: ${{ totalCostoMod1.toFixed(2) }} | Peso: {{ totalPesoMod1.toFixed(2) }} kg
          </span>
        </div>

        <!-- Formulario: Añadir Material -->
        <div class="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
          <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-gray-600">Añadir Material</h3>
          <div class="space-y-2 text-xs">
            <div>
              <div class="flex items-center justify-between mb-0.5">
                <label class="block font-medium text-gray-600">Buscar Código / Producto:</label>
                <span
                  v-if="formMod1.productoId"
                  class="text-[11px] font-bold px-2 py-0.5 rounded shadow-xs"
                  :class="getProductStock(formMod1.productoId) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'"
                >
                  Existencia Actual: {{ getProductStock(formMod1.productoId) }} {{ formMod1.unidadMedida }}
                </span>
              </div>
              <ProductSearchSelect
                v-model="formMod1.productoId"
                :products="productStore.sortedProductsByCode"
                :get-stock="getProductStock"
                placeholder="🔍 Buscar por código o nombre de material..."
                @select="onSelectProductMod1(formMod1.productoId)"
              />
            </div>

            <div>
              <label class="mb-0.5 block font-medium text-gray-600">Descripción:</label>
              <input
                :value="formMod1.descripcion"
                type="text"
                readonly
                placeholder="Descripción del material"
                class="w-full rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-xs text-gray-700 outline-none"
              />
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="mb-0.5 block font-medium text-gray-600">Costo (u):</label>
                <input
                  v-model.number="formMod1.costoUnitario"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                />
              </div>
              <div>
                <label class="mb-0.5 block font-medium text-gray-600">Peso (kg/u):</label>
                <input
                  v-model.number="formMod1.pesoKg"
                  type="number"
                  step="0.001"
                  min="0"
                  class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                />
              </div>
              <div>
                <label class="mb-0.5 block font-medium text-gray-600">Cantidad:</label>
                <div class="flex items-center gap-1">
                  <input
                    v-model.number="formMod1.cantidad"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                  />
                  <select
                    v-model="formMod1.unidadMedida"
                    class="rounded-lg border border-gray-300 bg-white px-1.5 py-1.5 text-xs outline-none"
                  >
                    <option value="pza">pza</option>
                    <option value="kg">kg</option>
                    <option value="m">m</option>
                    <option value="ud">ud</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="mt-3 flex justify-end gap-2 pt-1">
              <button
                type="button"
                :disabled="!formMod1.productoId || formMod1.cantidad <= 0"
                class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-40"
                @click="incluirMaterialMod1"
              >
                📥 Incluir
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                @click="clearFormMod1"
              >
                🗑️ Borrar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================================================================== -->
      <!-- MÓDULO 2: SALIDA - PRODUCTOS TERMINADOS (CARGO) -->
      <!-- ==================================================================== -->
      <div class="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <!-- Título Módulo 2 -->
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-gray-900">Módulo 2: Salida - Productos Terminados</h2>
            <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">Cargo</span>
          </div>
          <p class="mt-1 text-xs text-gray-500">
            Almacén: <span class="font-semibold text-emerald-950">{{ selectedWarehouseName }}</span>
            <span class="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">Mismo almacén</span>
          </p>
        </div>

        <!-- Tabla: Productos a Generar -->
        <div class="mb-1 rounded-t-lg bg-emerald-100/70 px-3 py-1.5 text-center text-xs font-bold text-emerald-950 border border-emerald-200/80">
          Productos a Generar
        </div>
        <div class="min-h-[220px] max-h-[300px] overflow-y-auto rounded-b-lg border border-gray-200 bg-white">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 bg-gray-100/90 text-gray-700 shadow-sm backdrop-blur-xs">
              <tr>
                <th class="border-b border-gray-200 px-2 py-1.5 font-semibold">Código</th>
                <th class="border-b border-gray-200 px-2 py-1.5 font-semibold">Descripción</th>
                <th class="border-b border-gray-200 px-2 py-1.5 text-right font-semibold">Costo (u)</th>
                <th class="border-b border-gray-200 px-2 py-1.5 text-right font-semibold">Peso (kg/u)</th>
                <th class="border-b border-gray-200 px-2 py-1.5 text-right font-semibold">Ctd.</th>
                <th class="border-b border-gray-200 px-2 py-1.5 text-center font-semibold"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(item, idx) in productosAGenerar"
                :key="item.productoId"
                class="hover:bg-emerald-50/40 transition"
              >
                <td class="px-2 py-1.5 font-mono text-gray-700">{{ item.codigo }}</td>
                <td class="px-2 py-1.5 text-gray-800">{{ item.descripcion }}</td>
                <td class="px-2 py-1.5 text-right text-gray-700 font-mono">{{ item.costoUnitario.toFixed(2) }}</td>
                <td class="px-2 py-1.5 text-right text-gray-700 font-mono">{{ item.pesoKg.toFixed(2) }}</td>
                <td class="px-2 py-1.5 text-right font-semibold text-gray-900 font-mono">{{ item.cantidad }}</td>
                <td class="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    title="Eliminar fila"
                    class="text-red-500 hover:text-red-700"
                    @click="removerProductoMod2(idx)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="productosAGenerar.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-xs text-gray-400">
                  No hay productos terminados agregados para generar.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Barra de Totales Módulo 2 -->
        <div class="mt-2 flex items-center justify-between rounded-lg bg-gray-100 px-4 py-2 text-xs font-bold text-gray-800 border border-gray-200">
          <span>Totales Módulo 2</span>
          <span class="font-mono text-emerald-700">
            Costo: ${{ totalCostoMod2.toFixed(2) }} | Peso: {{ totalPesoMod2.toFixed(2) }} kg
          </span>
        </div>

        <!-- Formulario: Añadir Producto -->
        <div class="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
          <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-gray-600">Añadir Producto</h3>
          <div class="space-y-2 text-xs">
            <div>
              <div class="flex items-center justify-between mb-0.5">
                <label class="block font-medium text-gray-600">Buscar Código / Producto:</label>
                <span
                  v-if="formMod2.productoId"
                  class="text-[11px] font-bold px-2 py-0.5 rounded shadow-xs"
                  :class="getProductStock(formMod2.productoId) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'"
                >
                  Existencia Actual: {{ getProductStock(formMod2.productoId) }} {{ formMod2.unidadMedida }}
                </span>
              </div>
              <ProductSearchSelect
                v-model="formMod2.productoId"
                :products="productStore.sortedProductsByCode"
                :get-stock="getProductStock"
                placeholder="🔍 Buscar por código o nombre de producto terminado..."
                @select="onSelectProductMod2(formMod2.productoId)"
              />
            </div>

            <div>
              <label class="mb-0.5 block font-medium text-gray-600">Descripción:</label>
              <input
                :value="formMod2.descripcion"
                type="text"
                readonly
                placeholder="Descripción del producto"
                class="w-full rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-xs text-gray-700 outline-none"
              />
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="mb-0.5 block font-medium text-gray-600">Costo (u):</label>
                <input
                  v-model.number="formMod2.costoUnitario"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                />
              </div>
              <div>
                <label class="mb-0.5 block font-medium text-gray-600">Peso (kg/u):</label>
                <input
                  v-model.number="formMod2.pesoKg"
                  type="number"
                  step="0.001"
                  min="0"
                  class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                />
              </div>
              <div>
                <label class="mb-0.5 block font-medium text-gray-600">Cantidad:</label>
                <div class="flex items-center gap-1">
                  <input
                    v-model.number="formMod2.cantidad"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                  />
                  <select
                    v-model="formMod2.unidadMedida"
                    class="rounded-lg border border-gray-300 bg-white px-1.5 py-1.5 text-xs outline-none"
                  >
                    <option value="ud">ud</option>
                    <option value="cja">cja</option>
                    <option value="pza">pza</option>
                    <option value="kg">kg</option>
                    <option value="m">m</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="mt-3 flex justify-end gap-2 pt-1">
              <button
                type="button"
                :disabled="!formMod2.productoId || formMod2.cantidad <= 0"
                class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-40"
                @click="incluirProductoMod2"
              >
                📥 Incluir
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                @click="clearFormMod2"
              >
                🗑️ Borrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Observación obligatoria -->
    <div
      v-if="!numeroDocumentoExito"
      class="mt-4 rounded-xl border bg-white p-4 shadow-sm"
      :class="observacion.trim() === '' ? 'border-amber-300 bg-amber-50/20' : 'border-gray-200'"
    >
      <label class="mb-1 block text-xs font-semibold text-gray-700">
        Observaciones o Notas de la Transformación <span class="text-red-500 font-bold">* Obligatorio</span>:
      </label>
      <input
        v-model="observacion"
        type="text"
        placeholder="Ej. Transformación de bobina a rollos fraccionados para pedido especial..."
        class="w-full rounded-lg border px-3 py-2 text-xs outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
        :class="observacion.trim() === '' ? 'border-amber-300 bg-white' : 'border-gray-300'"
      />
      <p v-if="observacion.trim() === ''" class="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-700">
        <svg class="h-3.5 w-3.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Es obligatorio añadir un comentario u observación para procesar la transformación.</span>
      </p>
    </div>

    <!-- ==================================================================== -->
    <!-- BARRA INFERIOR DE TOTALES Y BOTONES DE ACCIÓN -->
    <!-- ==================================================================== -->
    <div
      v-if="!numeroDocumentoExito"
      class="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-300 bg-white p-4 shadow-md"
    >
      <!-- Indicadores de Diferencial -->
      <div class="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-700">
        <div class="flex items-center gap-2">
          <span>Diferencia Total Costo:</span>
          <span
            :class="[
              'font-mono font-bold px-2 py-0.5 rounded',
              diferenciaCosto >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800',
            ]"
          >
            ${{ diferenciaCosto >= 0 ? '+' : '' }}{{ diferenciaCosto.toFixed(2) }}
          </span>
        </div>

        <div class="flex items-center gap-2 border-l border-gray-300 pl-4">
          <span>Diferencia Total Peso:</span>
          <span
            :class="[
              'font-mono font-bold px-2 py-0.5 rounded',
              diferenciaPeso >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
            ]"
          >
            {{ diferenciaPeso >= 0 ? '+' : '' }}{{ diferenciaPeso.toFixed(2) }} kg
          </span>
        </div>
      </div>

      <!-- Botones de Acción -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded-lg border border-brand bg-brand-50 px-4 py-2 text-xs font-bold text-brand transition hover:bg-brand-100"
          @click="showCargarPreliminarModal = true"
        >
          <span>📥 Cargar Preliminar</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
          @click="resetForm"
        >
          ❌ Cancelar
        </button>
        <button
          type="button"
          :disabled="!canSubmit || isSubmitting"
          class="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2 text-xs font-bold text-white shadow-md transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          @click="showConfirmModal = true"
        >
          <SpinnerIcon v-if="isSubmitting" />
          <span>⬆️ Continuar</span>
        </button>
      </div>
    </div>

    <!-- Diálogo de Confirmación -->
    <ConfirmDialog
      :open="showConfirmModal"
      title="Confirmar Transformación de Inventario"
      :message="`Se generará un Descargo de insumos y un Cargo de productos en el almacén ${selectedWarehouseName}. Ambos movimientos quedarán vinculados por correlativo único. ¿Deseas continuar?`"
      confirm-label="Confirmar y Ejecutar"
      cancel-label="Volver a revisar"
      :confirm-disabled="isSubmitting"
      @confirm="ejecutarTransformacion"
      @cancel="showConfirmModal = false"
    />

    <!-- Modal de Selección y Carga de Preliminares -->
    <CargarPreliminarModal
      v-if="showCargarPreliminarModal"
      filtro-tipo="INV_TRANSFORMACION"
      @close="showCargarPreliminarModal = false"
      @select="onSelectPreliminar"
    />
  </div>
</template>
