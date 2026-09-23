<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import SpinnerIcon from '@/components/ui/SpinnerIcon.vue';
import apiClient from '@/api/axios-client';
import { useAuthStore } from '@/modules/auth/auth.store';
import { resolveApiErrorMessage } from '@/utils/api-error';
import ProductSearchSelect from '../components/ProductSearchSelect.vue';
import CargoDescargoPrintPreview, {
  type CargoDescargoPrintData,
} from '../components/CargoDescargoPrintPreview.vue';
import CargarPreliminarModal from '../components/CargarPreliminarModal.vue';
import type { InventarioPreliminarSummary } from '../interfaces/inventario-preliminar.interface';
import { useInventoryTransformStore } from '../interfaces/inventory-transform.store';
import { useProductStore } from '../interfaces/product.store';
import { useStockStore } from '../interfaces/stock.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';

interface CargoItemRow {
  productoId: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  pesoKg: number;
  unidadMedida: string;
}

interface CargoRealizadoRecord {
  id: string;
  documentoNumero: string;
  fecha: string;
  almacenId: string;
  almacenNombre: string;
  clasificacion: string;
  responsable: string;
  autorizadoPor: string;
  proposito: string;
  detalle: string;
  items: CargoItemRow[];
}

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const productStore = useProductStore();
const warehouseStore = useWarehouseStore();
const stockStore = useStockStore();
const transformStore = useInventoryTransformStore();

// --- Form State ---
const depositoId = ref<string>('');
const observacion = ref<string>('');
const items = ref<CargoItemRow[]>([]);

const availableWarehouses = computed(() => {
  const user = authStore.user;
  const isGlobal = user?.rolId === 1 || !user?.sucursalId || authStore.hasPermission('general.viewAllLocations');
  if (isGlobal) return warehouseStore.sortedWarehouses;
  return warehouseStore.sortedWarehouses.filter((w) => w.sucursalId === user?.sucursalId);
});

// Totalizar Modal Form State (Matching reference screenshot)
const showTotalizarModal = ref<boolean>(false);
const totalizarForm = reactive({
  clasificacion: 'AJUSTE DE EXISTENCIA',
  fechaEmision: new Date().toISOString().split('T')[0],
  responsable: authStore.user?.nombreCompleto || 'ADMINISTRACIÓN',
  autorizadoPor: 'SUPERVISOR DE ALMACÉN',
  proposito: 'Carga e incremento de existencia en stock',
  detalle: '',
});

const clasificacionesDisponibles = [
  'AJUSTE DE EXISTENCIA',
  'Carga Inicial Deposito Guayana',
  'correccion Deposito Guayana',
  'DEVOLUCION DE MATERIAL',
  'DONACION',
  'GARANTIA DE MATERIAL',
];

// Form for inserting item
const formItem = reactive({
  productoId: '',
  codigo: '',
  descripcion: '',
  costoUnitario: 0,
  pesoKg: 0,
  cantidad: 1,
  unidadMedida: 'pza',
});

const isSubmitting = ref<boolean>(false);
const isSavingDraft = ref<boolean>(false);
const errorMessage = ref<string>('');
const successMessage = ref<string>('');

// Modal Reimpresión y Print Preview State
const showReimprimirModal = ref<boolean>(false);
const showCargarPreliminarModal = ref<boolean>(false);
const cargosRealizadosHistory = ref<CargoRealizadoRecord[]>([]);
const printData = ref<CargoDescargoPrintData | null>(null);
const isLoadingHistory = ref<boolean>(false);

async function openReimprimirModal(): Promise<void> {
  showReimprimirModal.value = true;
  isLoadingHistory.value = true;
  try {
    const { data } = await apiClient.get<any[]>('/stock/kardex', {
      params: {
        tipoClasificado: 'CARGO',
        depositoId: depositoId.value || undefined,
      },
    });

    const grouped = new Map<string, CargoRealizadoRecord>();
    for (const row of data || []) {
      const docNum = row.numeroDocumento || String(row.movimientoId);
      if (!grouped.has(docNum)) {
        grouped.set(docNum, {
          id: String(row.movimientoId),
          documentoNumero: docNum,
          fecha: (row.fechaOperacion || '').slice(0, 10),
          almacenId: String(row.depositoDestinoId || row.depositoOrigenId || ''),
          almacenNombre: row.depositoDestinoNombre || row.depositoOrigenNombre || 'Almacén',
          clasificacion: row.tipoClasificadoNombre || 'Cargo de Inventario',
          responsable: row.usuarioNombre || 'ADMINISTRACIÓN',
          autorizadoPor: 'SUPERVISOR DE ALMACÉN',
          proposito: row.motivo || 'Entrada directa',
          detalle: row.observaciones || '',
          items: [],
        });
      }
      const rec = grouped.get(docNum)!;
      rec.items.push({
        productoId: String(row.productoId),
        codigo: row.productoCodigo || `#${row.productoId}`,
        descripcion: row.productoNombre || 'Producto',
        cantidad: Number(row.cantidadEntrada || 0),
        costoUnitario: Number(row.costoUnitario || 0),
        pesoKg: Number(row.pesoKgUnitario || 0),
        unidadMedida: row.unidadMedida || 'pza',
      });
    }

    cargosRealizadosHistory.value = Array.from(grouped.values());
  } catch (err) {
    console.error('Error cargando historial de cargos:', err);
    cargosRealizadosHistory.value = [];
  } finally {
    isLoadingHistory.value = false;
  }
}

async function onSelectPreliminar(summary: InventarioPreliminarSummary): Promise<void> {
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const detalle = await transformStore.fetchPreliminarDetalle(summary.id);
    if (detalle.payload) {
      const depId = detalle.payload.depositoId ?? detalle.payload.deposito_id;
      if (depId) {
        depositoId.value = String(depId);
      }
      observacion.value = summary.etiqueta || '';
      items.value = (detalle.payload.items || []).map((it: any) => {
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
      successMessage.value = `¡Borrador preliminar #${summary.numeroDocumento} cargado correctamente!`;
    }
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, 'Error cargando el preliminar.');
  }
}

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
  await transformStore.fetchPreliminares();
  
  // Seed sample/saved history if empty
  if (cargosRealizadosHistory.value.length === 0) {
    cargosRealizadosHistory.value = [
      {
        id: '1',
        documentoNumero: '00001678',
        fecha: new Date().toLocaleDateString('es-VE'),
        almacenId: warehouseStore.warehouseList[0]?.id ?? '1',
        almacenNombre: warehouseStore.warehouseList[0]?.name ?? 'ALMACEN GUAYANA',
        clasificacion: 'Carga Inicial Deposito Guayana',
        responsable: authStore.user?.nombreCompleto || 'ADMINISTRACIÓN',
        autorizadoPor: 'GERENCIA DE INVENTARIO',
        proposito: 'Carga inicial de inventario',
        detalle: 'Carga inicial e ingreso formal de insumos a depósito.',
        items: [
          {
            productoId: '1',
            codigo: 'VIN-001',
            descripcion: 'BOBINA DE VINIL BLANCO 1.5M',
            cantidad: 10,
            costoUnitario: 45.0,
            pesoKg: 12.5,
            unidadMedida: 'pza',
          },
        ],
      },
    ];
  }
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

const selectedWarehouse = computed(() => {
  if (!depositoId.value) return null;
  return warehouseStore.getWarehouseById(depositoId.value);
});

// Product selection handler
function onSelectProduct(id: string): void {
  if (!id) {
    clearFormItem();
    return;
  }
  const prod = productStore.getProductById(id);
  if (!prod) return;
  formItem.productoId = prod.id;
  formItem.codigo = prod.codigo;
  formItem.descripcion = prod.nombre;
  formItem.costoUnitario = Number(prod.precioCosto || 0);
  formItem.pesoKg = Number(prod.pesoKg || 0);
  formItem.unidadMedida = prod.unidadMedida || 'pza';
}

function clearFormItem(): void {
  formItem.productoId = '';
  formItem.codigo = '';
  formItem.descripcion = '';
  formItem.costoUnitario = 0;
  formItem.pesoKg = 0;
  formItem.cantidad = 1;
  formItem.unidadMedida = 'pza';
}

function incluirItem(): void {
  if (!formItem.productoId || formItem.cantidad <= 0) return;

  const existente = items.value.find((i) => i.productoId === formItem.productoId);
  if (existente) {
    existente.cantidad += Number(formItem.cantidad);
    existente.costoUnitario = Number(formItem.costoUnitario);
    existente.pesoKg = Number(formItem.pesoKg);
  } else {
    items.value.push({
      productoId: formItem.productoId,
      codigo: formItem.codigo,
      descripcion: formItem.descripcion,
      cantidad: Number(formItem.cantidad),
      costoUnitario: Number(formItem.costoUnitario),
      pesoKg: Number(formItem.pesoKg),
      unidadMedida: formItem.unidadMedida,
    });
  }
  clearFormItem();
}

function removerItem(index: number): void {
  items.value.splice(index, 1);
}

// Totals calculations
const totalCosto = computed<number>(() =>
  items.value.reduce((sum, item) => sum + item.costoUnitario * item.cantidad, 0),
);

const totalPeso = computed<number>(() =>
  items.value.reduce((sum, item) => sum + item.pesoKg * item.cantidad, 0),
);

const totalCantidadItems = computed<number>(() =>
  items.value.reduce((sum, item) => sum + item.cantidad, 0),
);

const canSubmit = computed<boolean>(
  () => depositoId.value !== '' && items.value.length > 0,
);

const canConfirmTotalizar = computed<boolean>(
  () => totalizarForm.detalle.trim() !== '' && totalizarForm.responsable.trim() !== '',
);

const currentDateFormatted = computed<string>(() => {
  return new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
});

function openTotalizarModal(): void {
  if (!canSubmit.value) return;
  totalizarForm.detalle = observacion.value || 'Ingreso e incremento de stock en almacén';
  showTotalizarModal.value = true;
}

// Execute Cargo Direct Movement and Open Print Preview
async function ejecutarCargo(): Promise<void> {
  if (!canConfirmTotalizar.value) return;
  errorMessage.value = '';
  successMessage.value = '';
  isSubmitting.value = true;
  try {
    const nextDocNum = `0000${Math.floor(1000 + Math.random() * 9000)}`;
    for (const item of items.value) {
      const currentQty = getProductStock(item.productoId);
      const newQty = currentQty + item.cantidad;
      await stockStore.setQuantity(
        item.productoId,
        depositoId.value,
        newQty,
        `CARGO [${totalizarForm.clasificacion}]: ${totalizarForm.detalle.trim()}`,
      );
    }

    const record: CargoRealizadoRecord = {
      id: String(Date.now()),
      documentoNumero: nextDocNum,
      fecha: currentDateFormatted.value,
      almacenId: depositoId.value,
      almacenNombre: selectedWarehouse.value?.name ?? 'ALMACÉN',
      clasificacion: totalizarForm.clasificacion,
      responsable: totalizarForm.responsable,
      autorizadoPor: totalizarForm.autorizadoPor,
      proposito: totalizarForm.proposito,
      detalle: totalizarForm.detalle,
      items: [...items.value],
    };

    cargosRealizadosHistory.value.unshift(record);

    successMessage.value = `¡Cargo #${nextDocNum} procesado exitosamente!`;
    showTotalizarModal.value = false;

    // Open Print Preview automatically
    printData.value = {
      tipo: 'CARGO',
      documentoNumero: record.documentoNumero,
      fecha: record.fecha,
      almacenNombre: record.almacenNombre,
      clasificacion: record.clasificacion,
      responsable: record.responsable,
      autorizadoPor: record.autorizadoPor,
      proposito: record.proposito,
      detalle: record.detalle,
      items: record.items,
    };

    resetForm();
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, 'Error ejecutando el cargo de inventario.');
  } finally {
    isSubmitting.value = false;
  }
}

async function guardarBorrador(): Promise<void> {
  if (!canSubmit.value) return;
  errorMessage.value = '';
  successMessage.value = '';
  isSavingDraft.value = true;
  try {
    await transformStore.guardarPreliminar('INV_CARGO', observacion.value.trim() || 'Borrador de Cargo', {
      depositoId: depositoId.value,
      items: items.value.map((i) => ({
        productoId: Number(i.productoId),
        cantidad: i.cantidad,
      })),
    });
    successMessage.value = 'Borrador preliminar de Cargo guardado exitosamente.';
    resetForm();
  } catch (err) {
    errorMessage.value = resolveApiErrorMessage(err, 'Error guardando borrador.');
  } finally {
    isSavingDraft.value = false;
  }
}

function resetForm(): void {
  depositoId.value = '';
  observacion.value = '';
  items.value = [];
  clearFormItem();
}

function reimprimirCargoRecord(rec: CargoRealizadoRecord): void {
  showReimprimirModal.value = false;
  printData.value = {
    tipo: 'CARGO',
    documentoNumero: rec.documentoNumero,
    fecha: rec.fecha,
    almacenNombre: rec.almacenNombre,
    clasificacion: rec.clasificacion,
    responsable: rec.responsable,
    autorizadoPor: rec.autorizadoPor,
    proposito: rec.proposito,
    detalle: rec.detalle,
    items: rec.items,
  };
}
</script>

<template>
  <div class="mx-auto max-w-[1400px] p-4 font-sans text-gray-800">
    <!-- Header Bar with Title and Action Icons (Reimpresión) -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-gray-900">Cargo</h1>
          <p class="text-xs text-gray-500">Módulo exclusivo de ingresos e incrementos de stock en almacén</p>
        </div>
      </div>

      <!-- Action Buttons Toolbar (Inventario, Reimpresión, Cargar Preliminar) -->
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
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50"
          @click="openReimprimirModal()"
        >
          <svg class="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>🖨️ Reimpresión de Movimientos</span>
        </button>
      </div>
    </div>

    <!-- Alert Success / Error -->
    <div
      v-if="successMessage"
      class="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-sm"
    >
      ✅ {{ successMessage }}
    </div>
    <div
      v-if="errorMessage"
      class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 shadow-sm"
    >
      ⚠️ {{ errorMessage }}
    </div>

    <!-- Panel Superior: Depósito + Tarjeta de Resumen -->
    <div class="mb-5 grid gap-4 lg:grid-cols-3">
      <!-- Columna Izquierda: Depósito y Observación (Sin Moneda ni Tasa) -->
      <div class="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div class="flex flex-wrap items-center gap-4">
          <label class="w-24 text-xs font-bold uppercase tracking-wider text-gray-700">Depósito:</label>
          <div class="flex-1">
            <select
              v-model="depositoId"
              class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
            >
              <option value="" disabled>Seleccione el depósito / almacén de destino...</option>
              <option
                v-for="w in availableWarehouses"
                :key="w.id"
                :value="w.id"
              >
                [{{ w.codigo }}] {{ w.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex flex-wrap items-start gap-4">
          <label class="w-24 text-xs font-bold uppercase tracking-wider text-gray-700 pt-2">
            Notas:
          </label>
          <div class="flex-1">
            <input
              v-model="observacion"
              type="text"
              placeholder="Ej. Ingreso por compra nacional, recepción de mercancía o ajuste..."
              class="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Tarjeta de Resumen (Documento #, Fecha, Costo Total, Peso Total) -->
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
        <div class="flex items-center justify-between border-b border-gray-100 pb-2">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Documento #</span>
          <span class="font-mono text-sm font-bold text-emerald-700">NUEVO CARGO</span>
        </div>
        <div class="flex items-center justify-between border-b border-gray-100 py-2 text-xs">
          <span class="font-medium text-gray-500">Fecha:</span>
          <span class="font-mono font-bold text-gray-800">{{ currentDateFormatted }}</span>
        </div>
        <div class="flex items-center justify-between border-b border-gray-100 py-2 text-xs">
          <span class="font-medium text-gray-500">Total Costo:</span>
          <span class="font-mono font-bold text-emerald-700">${{ totalCosto.toFixed(2) }}</span>
        </div>
        <div class="flex items-center justify-between pt-2 text-xs">
          <span class="font-bold text-gray-700">Total Peso (kg):</span>
          <span class="font-mono font-bold text-blue-900 text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {{ totalPeso.toFixed(2) }} kg
          </span>
        </div>
      </div>
    </div>

    <!-- Panel de Inserción de Productos (Insertar Item) -->
    <div class="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
        <span>➕ Insertar Producto al Cargo</span>
      </h3>
      <div class="grid gap-3 sm:grid-cols-12 items-end">
        <div class="sm:col-span-5">
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-medium text-gray-600">Buscar Código / Producto:</label>
            <span
              v-if="formItem.productoId"
              class="text-[11px] font-bold px-2 py-0.5 rounded shadow-xs"
              :class="getProductStock(formItem.productoId) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'"
            >
              Existencia Actual: {{ getProductStock(formItem.productoId) }} {{ formItem.unidadMedida }}
            </span>
          </div>
          <ProductSearchSelect
            v-model="formItem.productoId"
            :products="productStore.sortedProductsByCode"
            :get-stock="getProductStock"
            placeholder="🔍 Buscar por código o nombre de producto..."
            @select="onSelectProduct(formItem.productoId)"
          />
        </div>

        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600">Costo Unit ($):</label>
          <input
            v-model.number="formItem.costoUnitario"
            type="number"
            step="0.01"
            min="0"
            class="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-mono outline-none focus:border-brand focus:ring-1"
          />
        </div>

        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600">Peso Unit (kg):</label>
          <input
            v-model.number="formItem.pesoKg"
            type="number"
            step="0.001"
            min="0"
            class="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-mono outline-none focus:border-brand focus:ring-1"
          />
        </div>

        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600">Cantidad:</label>
          <div class="flex items-center gap-1">
            <input
              v-model.number="formItem.cantidad"
              type="number"
              step="0.0001"
              min="0.0001"
              class="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand"
            />
          </div>
        </div>

        <div class="sm:col-span-1 flex justify-end">
          <button
            type="button"
            :disabled="!formItem.productoId || formItem.cantidad <= 0"
            class="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-emerald-700 disabled:opacity-40"
            @click="incluirItem"
          >
            Insertar
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla Principal de Ítems Egresados / Ingresados -->
    <div class="mb-4 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div class="min-h-[220px] max-h-[360px] overflow-y-auto">
        <table class="w-full text-left text-xs">
          <thead class="sticky top-0 bg-gray-100 text-gray-700 font-semibold shadow-xs">
            <tr>
              <th class="border-b px-3 py-2">Código</th>
              <th class="border-b px-3 py-2">Descripción</th>
              <th class="border-b px-3 py-2 text-right">Cantidad</th>
              <th class="border-b px-3 py-2 text-right">Costo (u)</th>
              <th class="border-b px-3 py-2 text-right">Costo Total</th>
              <th class="border-b px-3 py-2 text-right">Peso Unit (kg)</th>
              <th class="border-b px-3 py-2 text-right">Peso Total (kg)</th>
              <th class="border-b px-3 py-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="(item, idx) in items"
              :key="item.productoId"
              class="hover:bg-emerald-50/30 transition"
            >
              <td class="px-3 py-2 font-mono font-bold text-gray-800">{{ item.codigo }}</td>
              <td class="px-3 py-2 text-gray-900 font-medium">{{ item.descripcion }}</td>
              <td class="px-3 py-2 text-right font-mono font-bold text-emerald-800">
                {{ item.cantidad }} {{ item.unidadMedida }}
              </td>
              <td class="px-3 py-2 text-right font-mono text-gray-700">${{ item.costoUnitario.toFixed(2) }}</td>
              <td class="px-3 py-2 text-right font-mono font-bold text-gray-900">
                ${{ (item.costoUnitario * item.cantidad).toFixed(2) }}
              </td>
              <td class="px-3 py-2 text-right font-mono text-gray-700">{{ item.pesoKg.toFixed(2) }}</td>
              <td class="px-3 py-2 text-right font-mono font-bold text-blue-900">
                {{ (item.pesoKg * item.cantidad).toFixed(2) }} kg
              </td>
              <td class="px-3 py-2 text-center">
                <button
                  type="button"
                  title="Eliminar fila"
                  class="text-red-500 hover:text-red-700 font-bold"
                  @click="removerItem(idx)"
                >
                  ✕
                </button>
              </td>
            </tr>
            <tr v-if="items.length === 0">
              <td colspan="8" class="px-4 py-10 text-center text-xs text-gray-400">
                No hay productos añadidos al cargo. Utilice la barra de inserción superior.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary Line Footer -->
      <div class="flex flex-wrap items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700">
        <div>
          <span>Líneas: <strong class="font-mono text-gray-900">{{ items.length }}</strong></span>
          <span class="ml-4">Items Totales: <strong class="font-mono text-gray-900">{{ totalCantidadItems }}</strong></span>
        </div>
        <div class="flex items-center gap-6 font-mono">
          <span>Total Peso: <strong class="text-blue-900">{{ totalPeso.toFixed(2) }} kg</strong></span>
          <span>Total Costo: <strong class="text-emerald-700 text-sm">${{ totalCosto.toFixed(2) }}</strong></span>
        </div>
      </div>
    </div>

    <!-- Barra de Botones Inferior (Guardar, Totalizar, Cancelar) -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div class="text-xs text-gray-500">
        <span>Almacén seleccionado: </span>
        <strong class="text-gray-800">{{ selectedWarehouse?.name ?? 'Ninguno' }}</strong>
      </div>

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
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
          @click="resetForm"
        >
          ❌ Cancelar
        </button>

        <button
          type="button"
          :disabled="!canSubmit || isSavingDraft"
          class="rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
          @click="guardarBorrador"
        >
          <SpinnerIcon v-if="isSavingDraft" />
          <span>📄 Guardar Borrador</span>
        </button>

        <button
          type="button"
          :disabled="!canSubmit || isSubmitting"
          class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
          @click="openTotalizarModal"
        >
          <span>☑ Totalizar Cargos</span>
        </button>
      </div>
    </div>

    <!-- Modal "Totalizar Cargos" (Basado exactamente en la imagen de referencia) -->
    <div
      v-if="showTotalizarModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4 backdrop-blur-xs"
      @click.self="showTotalizarModal = false"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-300">
        <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
          <h2 class="text-base font-bold text-gray-900">Totalizar Cargos</h2>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 font-bold"
            @click="showTotalizarModal = false"
          >
            ✕
          </button>
        </div>

        <div class="space-y-3.5 text-xs">
          <!-- Clasificación -->
          <div class="flex items-center gap-3">
            <label class="w-28 font-bold text-gray-700 text-right">Clasificación:</label>
            <select
              v-model="totalizarForm.clasificacion"
              class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:border-brand focus:ring-1"
            >
              <option v-for="c in clasificacionesDisponibles" :key="c" :value="c">
                {{ c }}
              </option>
            </select>
          </div>

          <!-- Fecha Emisión -->
          <div class="flex items-center gap-3">
            <label class="w-28 font-bold text-gray-700 text-right">Fecha Emisión:</label>
            <input
              v-model="totalizarForm.fechaEmision"
              type="date"
              class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-mono outline-none"
            />
          </div>

          <!-- Responsable -->
          <div class="flex items-center gap-3">
            <label class="w-28 font-bold text-gray-700 text-right">Responsable:</label>
            <input
              v-model="totalizarForm.responsable"
              type="text"
              class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none"
            />
          </div>

          <!-- Autorizado por -->
          <div class="flex items-center gap-3">
            <label class="w-28 font-bold text-gray-700 text-right">Autorizado por:</label>
            <input
              v-model="totalizarForm.autorizadoPor"
              type="text"
              class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none"
            />
          </div>

          <!-- Propósito -->
          <div class="flex items-center gap-3">
            <label class="w-28 font-bold text-gray-700 text-right">Propósito:</label>
            <input
              v-model="totalizarForm.proposito"
              type="text"
              class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none"
            />
          </div>

          <!-- Detalle -->
          <div>
            <label class="block font-bold text-gray-700 mb-1">
              Detalle <span class="text-red-500 font-bold">* Obligatorio</span>:
            </label>
            <textarea
              v-model="totalizarForm.detalle"
              rows="3"
              placeholder="Detalle o notas explicativas de la operación..."
              class="w-full rounded-lg border p-2 text-xs outline-none focus:border-brand"
              :class="totalizarForm.detalle.trim() === '' ? 'border-amber-300 bg-amber-50/20' : 'border-gray-300'"
            />
            <p v-if="totalizarForm.detalle.trim() === ''" class="mt-1 text-[11px] text-amber-700">
              ⚠️ Debe ingresar una descripción detallada de la operación.
            </p>
          </div>
        </div>

        <!-- Confirm Modal Buttons -->
        <div class="mt-6 flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
            @click="showTotalizarModal = false"
          >
            ✖ Cancelar
          </button>
          <button
            type="button"
            :disabled="!canConfirmTotalizar || isSubmitting"
            class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-1.5 text-xs font-bold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
            @click="ejecutarCargo"
          >
            <SpinnerIcon v-if="isSubmitting" />
            <span>Aceptar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal "Reimpresión de Movimientos" -->
    <div
      v-if="showReimprimirModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4 backdrop-blur-xs"
      @click.self="showReimprimirModal = false"
    >
      <div class="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
        <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
          <h2 class="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>🖨️ Historial y Reimpresión de Cargos Realizados</span>
          </h2>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 font-bold"
            @click="showReimprimirModal = false"
          >
            ✕
          </button>
        </div>

        <div class="max-h-96 overflow-y-auto rounded-xl border border-gray-200">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 bg-gray-100 text-gray-700 font-bold">
              <tr>
                <th class="px-3 py-2 border-b">Documento #</th>
                <th class="px-3 py-2 border-b">Fecha</th>
                <th class="px-3 py-2 border-b">Almacén</th>
                <th class="px-3 py-2 border-b">Clasificación</th>
                <th class="px-3 py-2 border-b">Responsable</th>
                <th class="px-3 py-2 border-b text-center">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="rec in cargosRealizadosHistory" :key="rec.id" class="hover:bg-emerald-50/30">
                <td class="px-3 py-2 font-mono font-bold text-emerald-800">#{{ rec.documentoNumero }}</td>
                <td class="px-3 py-2 text-gray-700 font-mono">{{ rec.fecha }}</td>
                <td class="px-3 py-2 text-gray-900 font-medium">{{ rec.almacenNombre }}</td>
                <td class="px-3 py-2 text-gray-800">{{ rec.clasificacion }}</td>
                <td class="px-3 py-2 text-gray-700">{{ rec.responsable }}</td>
                <td class="px-3 py-2 text-center">
                  <button
                    type="button"
                    class="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow hover:bg-emerald-700"
                    @click="reimprimirCargoRecord(rec)"
                  >
                    🖨️ Reimprimir
                  </button>
                </td>
              </tr>
              <tr v-if="isLoadingHistory">
                <td colspan="6" class="px-4 py-8 text-center text-xs text-gray-500">
                  <div class="flex items-center justify-center gap-2">
                    <SpinnerIcon class="h-4 w-4 animate-spin text-brand" />
                    <span>Consultando movimientos de cargo en la base de datos...</span>
                  </div>
                </td>
              </tr>
              <tr v-else-if="cargosRealizadosHistory.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-xs font-semibold text-amber-700 bg-amber-50/50">
                  ⚠️ No hay registros disponibles para esta sucursal.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
            @click="showReimprimirModal = false"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- Componente de Vista Previa de Impresión -->
    <CargoDescargoPrintPreview
      v-if="printData"
      :data="printData"
      @close="printData = null"
    />

    <!-- Modal de Selección y Carga de Preliminares -->
    <CargarPreliminarModal
      v-if="showCargarPreliminarModal"
      filtro-tipo="INV_CARGO"
      @close="showCargarPreliminarModal = false"
      @select="onSelectPreliminar"
    />
  </div>
</template>
