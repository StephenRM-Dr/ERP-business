<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { usePagination } from '@/composables/usePagination';
import { useProductStore } from '../interfaces/product.store';
import { useMonedaStore } from '../interfaces/moneda.store';
import { useCategoryStore } from '../interfaces/category.store';
import apiClient from '@/api/axios-client';

interface StorePricingDef {
  key: string;
  name: string;
  shortName: string;
  bsNivelId: number;
  divisaNivelId: number;
  colorClass: string;
  badgeBg: string;
}

const STORES: StorePricingDef[] = [
  { key: 'SC', name: 'San Cristóbal', shortName: 'San Cristóbal', bsNivelId: 2, divisaNivelId: 11, colorClass: 'text-sky-700 border-sky-200', badgeBg: 'bg-sky-50 text-sky-800' },
  { key: 'CONCORDIA', name: 'Concordia', shortName: 'Concordia', bsNivelId: 4, divisaNivelId: 11, colorClass: 'text-teal-700 border-teal-200', badgeBg: 'bg-teal-50 text-teal-800' },
  { key: 'CARACAS', name: 'Caracas', shortName: 'Caracas', bsNivelId: 5, divisaNivelId: 13, colorClass: 'text-blue-700 border-blue-200', badgeBg: 'bg-blue-50 text-blue-800' },
  { key: 'VALENCIA', name: 'Valencia', shortName: 'Valencia', bsNivelId: 6, divisaNivelId: 14, colorClass: 'text-indigo-700 border-indigo-200', badgeBg: 'bg-indigo-50 text-indigo-800' },
  { key: 'BARINAS', name: 'Barinas', shortName: 'Barinas', bsNivelId: 7, divisaNivelId: 15, colorClass: 'text-amber-700 border-amber-200', badgeBg: 'bg-amber-50 text-amber-800' },
  { key: 'MCBO', name: 'Maracaibo', shortName: 'Maracaibo', bsNivelId: 8, divisaNivelId: 16, colorClass: 'text-emerald-700 border-emerald-200', badgeBg: 'bg-emerald-50 text-emerald-800' },
  { key: 'NACIONAL', name: 'Precio Nacional (SC)', shortName: 'Nacional (SC)', bsNivelId: 10, divisaNivelId: 12, colorClass: 'text-purple-700 border-purple-200', badgeBg: 'bg-purple-50 text-purple-800' },
  { key: 'MERIDA', name: 'Mérida', shortName: 'Mérida', bsNivelId: 9, divisaNivelId: 17, colorClass: 'text-cyan-700 border-cyan-200', badgeBg: 'bg-cyan-50 text-cyan-800' },
];

interface ProductPriceRow {
  productId: string;
  codigo: string;
  nombre: string;
  categoriaId: number;
  cost: number;
  pricesMap: Record<number, number>;
  originalPricesMap: Record<number, number>;
  isSaving: boolean;
  isModified: boolean;
  errorMessage: string;
  successMessage: string;
}

interface PreviewResult {
  tipo: 'BS' | 'DIVISA';
  filename: string;
  totalProducts: number;
  totalPriceEntries: number;
  sampleItems: Array<{
    codigo: string;
    nombre: string;
    precios: Record<number, number>;
  }>;
  rawItems: Array<{ codigo: string; nivel_precio_id: number; moneda_id: number; precio: number }>;
}

const { t } = useI18n();
const productStore = useProductStore();
const monedaStore = useMonedaStore();
const categoryStore = useCategoryStore();

// Filtros y selección separados
const filterCodigo = ref<string>('');
const filterNombre = ref<string>('');
const selectedCategoryId = ref<string>('ALL');
const priceStatusFilter = ref<'ALL' | 'WITH_PRICE' | 'WITHOUT_PRICE'>('ALL');
const selectedStoreKey = ref<string>('ALL');

// Ordenamiento de columnas (por defecto: Código ascendente natural)
const sortKey = ref<'codigo' | 'nombre' | 'cost'>('codigo');
const sortOrder = ref<'asc' | 'desc'>('asc');

function toggleSort(key: 'codigo' | 'nombre' | 'cost') {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
}

// Excel state
const isUploading = ref<boolean>(false);
const isApplyingBatch = ref<boolean>(false);
const uploadStatusMessage = ref<string>('');
const uploadErrorMessage = ref<string>('');
const isDownloading = ref<boolean>(false);

const bsFileInput = ref<HTMLInputElement | null>(null);
const divisasFileInput = ref<HTMLInputElement | null>(null);

// Preview modal state
const isPreviewModalOpen = ref<boolean>(false);
const previewData = ref<PreviewResult | null>(null);

function buildProductRow(productId: string): ProductPriceRow {
  const product = productStore.getProductById(productId);
  const pricesMap: Record<number, number> = {};

  (product?.precios ?? []).forEach((p) => {
    pricesMap[p.nivelPrecioId] = Number(p.precio) || 0;
  });

  return {
    productId,
    codigo: product?.codigo ?? '',
    nombre: product?.nombre ?? '',
    categoriaId: product?.categoriaId ?? 0,
    cost: product?.precioCosto ?? 0,
    pricesMap,
    originalPricesMap: { ...pricesMap },
    isSaving: false,
    isModified: false,
    errorMessage: '',
    successMessage: '',
  };
}

const rows = reactive<ProductPriceRow[]>([]);

function loadRows(): void {
  // Ordenar productos naturalmente por código al cargar
  const sorted = [...productStore.productList].sort((a, b) =>
    a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }),
  );
  rows.splice(0, rows.length, ...sorted.map((product) => buildProductRow(product.id)));
}

async function reloadProductsAndPrices(): Promise<void> {
  await productStore.fetchProducts();
  loadRows();
}

onMounted(async () => {
  await Promise.all([
    productStore.productList.length === 0 ? productStore.fetchProducts() : Promise.resolve(),
    monedaStore.monedaList.length === 0 ? monedaStore.fetchMonedas() : Promise.resolve(),
    categoryStore.categoryList.length === 0 ? categoryStore.fetchCategories() : Promise.resolve(),
  ]);
  loadRows();
});

const activeStore = computed<StorePricingDef | undefined>(() =>
  STORES.find((s) => s.key === selectedStoreKey.value),
);

// Filtros avanzados y ordenamiento
const filteredRows = computed<ProductPriceRow[]>(() => {
  const codeTerm = filterCodigo.value.trim().toLowerCase();
  const nameTerm = filterNombre.value.trim().toLowerCase();
  const catId = selectedCategoryId.value;
  const status = priceStatusFilter.value;
  const store = activeStore.value;

  const result = rows.filter((row) => {
    // 1. Filtro por código específico
    if (codeTerm !== '' && !row.codigo.toLowerCase().includes(codeTerm)) {
      return false;
    }

    // 2. Filtro por descripción / nombre específica
    if (nameTerm !== '' && !row.nombre.toLowerCase().includes(nameTerm)) {
      return false;
    }

    // 3. Filtro por categoría
    if (catId !== 'ALL' && String(row.categoriaId) !== catId) {
      return false;
    }

    // 4. Filtro por estado de precios
    if (status !== 'ALL') {
      let hasPrice = false;
      if (store) {
        // En tienda específica: comprobar precio Bs o Divisa de esa tienda
        const bs = row.pricesMap[store.bsNivelId] ?? 0;
        const div = row.pricesMap[store.divisaNivelId] ?? 0;
        hasPrice = bs > 0 || div > 0;
      } else {
        // En matriz general: comprobar si tiene al menos un precio asignado
        hasPrice = Object.values(row.pricesMap).some((price) => Number(price) > 0);
      }

      if (status === 'WITH_PRICE' && !hasPrice) return false;
      if (status === 'WITHOUT_PRICE' && hasPrice) return false;
    }

    return true;
  });

  // Ordenamiento por columna
  return result.sort((a, b) => {
    let cmp = 0;
    if (sortKey.value === 'codigo') {
      cmp = a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' });
    } else if (sortKey.value === 'nombre') {
      cmp = a.nombre.localeCompare(b.nombre);
    } else if (sortKey.value === 'cost') {
      cmp = (a.cost || 0) - (b.cost || 0);
    }
    return sortOrder.value === 'asc' ? cmp : -cmp;
  });
});

const pagination = usePagination(filteredRows, 15);

// Resetear página al cambiar cualquier filtro
watch(
  [filterCodigo, filterNombre, selectedCategoryId, priceStatusFilter, selectedStoreKey, sortKey, sortOrder],
  () => {
    pagination.resetPage();
  },
);

const activeFiltersCount = computed<number>(() => {
  let count = 0;
  if (filterCodigo.value.trim() !== '') count++;
  if (filterNombre.value.trim() !== '') count++;
  if (selectedCategoryId.value !== 'ALL') count++;
  if (priceStatusFilter.value !== 'ALL') count++;
  return count;
});

function resetFilters(): void {
  filterCodigo.value = '';
  filterNombre.value = '';
  selectedCategoryId.value = 'ALL';
  priceStatusFilter.value = 'ALL';
  sortKey.value = 'codigo';
  sortOrder.value = 'asc';
}

// Manual 1x1 Price Save
async function savePrice(row: ProductPriceRow, nivelId: number, precio: number, monedaId: number): Promise<void> {
  const product = productStore.getProductById(row.productId);
  if (!product) return;

  row.isSaving = true;
  row.errorMessage = '';
  row.successMessage = '';

  try {
    await apiClient.post(`/productos/${product.codigo}/precios`, {
      nivel_precio_id: nivelId,
      moneda_id: monedaId,
      precio: Number(precio) || 0,
    });
    row.pricesMap[nivelId] = Number(precio) || 0;
    row.originalPricesMap[nivelId] = Number(precio) || 0;
    row.isModified = false;
    row.successMessage = 'Guardado';
    setTimeout(() => {
      row.successMessage = '';
    }, 2000);
  } catch (err: any) {
    row.errorMessage = err.response?.data?.message || 'Error al guardar precio';
  } finally {
    row.isSaving = false;
  }
}

function onPriceInput(row: ProductPriceRow, nivelId: number, event: Event): void {
  const target = event.target as HTMLInputElement;
  const val = Number(target.value);
  row.pricesMap[nivelId] = isNaN(val) ? 0 : val;
  row.isModified = true;
}

function discardRowChanges(row: ProductPriceRow): void {
  row.pricesMap = { ...row.originalPricesMap };
  row.isModified = false;
  row.errorMessage = '';
}

async function saveRowPrices(row: ProductPriceRow): Promise<void> {
  const product = productStore.getProductById(row.productId);
  if (!product) return;

  row.isSaving = true;
  row.errorMessage = '';
  row.successMessage = '';

  const itemsToSave: Array<{ codigo: string; nivel_precio_id: number; moneda_id: number; precio: number }> = [];
  for (const store of STORES) {
    itemsToSave.push({
      codigo: row.codigo,
      nivel_precio_id: store.bsNivelId,
      moneda_id: 1,
      precio: Number(row.pricesMap[store.bsNivelId]) || 0,
    });
    itemsToSave.push({
      codigo: row.codigo,
      nivel_precio_id: store.divisaNivelId,
      moneda_id: 2,
      precio: Number(row.pricesMap[store.divisaNivelId]) || 0,
    });
  }

  try {
    const { data } = await apiClient.post<{ updated: number; message: string }>('/productos/precios/batch', {
      items: itemsToSave,
    });
    row.originalPricesMap = { ...row.pricesMap };
    row.isModified = false;
    row.successMessage = 'Guardado';
    setTimeout(() => {
      row.successMessage = '';
    }, 2500);
  } catch (err: any) {
    row.errorMessage = err.response?.data?.message || 'Error al guardar';
  } finally {
    row.isSaving = false;
  }
}

// --- Totalización Individual por Producto ---
interface TotalizingProductState {
  productId: string;
  codigo: string;
  nombre: string;
  categoriaNombre: string;
  cost: number;
  tempPrices: Record<number, number>;
  isSaving: boolean;
  saveMessage: string;
  saveError: string;
}

const isProductTotalizeModalOpen = ref<boolean>(false);
const totalizingProduct = ref<TotalizingProductState | null>(null);
const targetMarginPercent = ref<number>(30);

function openProductTotalization(row: ProductPriceRow): void {
  const cat = categoryStore.getCategoryById(String(row.categoriaId));
  totalizingProduct.value = {
    productId: row.productId,
    codigo: row.codigo,
    nombre: row.nombre,
    categoriaNombre: cat?.nombre || 'General',
    cost: row.cost || 0,
    tempPrices: { ...row.pricesMap },
    isSaving: false,
    saveMessage: '',
    saveError: '',
  };
  isProductTotalizeModalOpen.value = true;
}

// Estadísticas en tiempo real de la totalización del producto
const productTotalizeStats = computed(() => {
  if (!totalizingProduct.value) {
    return {
      avgDivisa: 0,
      minDivisa: 0,
      maxDivisa: 0,
      avgBs: 0,
      configuredDivisaCount: 0,
      configuredBsCount: 0,
      avgMarginPercent: 0,
      avgProfitUsd: 0,
    };
  }

  const cost = totalizingProduct.value.cost || 0;
  const divisaPrices: number[] = [];
  const bsPrices: number[] = [];

  for (const store of STORES) {
    const divVal = totalizingProduct.value.tempPrices[store.divisaNivelId];
    if (divVal !== undefined && divVal > 0) {
      divisaPrices.push(divVal);
    }
    const bsVal = totalizingProduct.value.tempPrices[store.bsNivelId];
    if (bsVal !== undefined && bsVal > 0) {
      bsPrices.push(bsVal);
    }
  }

  const avgDivisa = divisaPrices.length > 0 ? divisaPrices.reduce((a, b) => a + b, 0) / divisaPrices.length : 0;
  const minDivisa = divisaPrices.length > 0 ? Math.min(...divisaPrices) : 0;
  const maxDivisa = divisaPrices.length > 0 ? Math.max(...divisaPrices) : 0;
  const avgBs = bsPrices.length > 0 ? bsPrices.reduce((a, b) => a + b, 0) / bsPrices.length : 0;

  const avgProfitUsd = avgDivisa > 0 && cost > 0 ? avgDivisa - cost : 0;
  const avgMarginPercent = cost > 0 && avgDivisa > 0 ? ((avgDivisa - cost) / cost) * 100 : 0;

  return {
    avgDivisa,
    minDivisa,
    maxDivisa,
    avgBs,
    configuredDivisaCount: divisaPrices.length,
    configuredBsCount: bsPrices.length,
    avgMarginPercent,
    avgProfitUsd,
  };
});

// Herramientas rápidas en modal de producto
function applyTargetMarginToAll(): void {
  if (!totalizingProduct.value) return;
  const cost = totalizingProduct.value.cost || 0;
  if (cost <= 0) return;
  const margin = Number(targetMarginPercent.value) || 0;
  const calculatedPrice = Number((cost * (1 + margin / 100)).toFixed(2));

  for (const store of STORES) {
    totalizingProduct.value.tempPrices[store.divisaNivelId] = calculatedPrice;
  }
}

function replicateScToAll(): void {
  if (!totalizingProduct.value) return;
  const scBs = totalizingProduct.value.tempPrices[2] ?? 0;
  const scDiv = totalizingProduct.value.tempPrices[11] ?? 0;

  for (const store of STORES) {
    if (scBs > 0) totalizingProduct.value.tempPrices[store.bsNivelId] = scBs;
    if (scDiv > 0) totalizingProduct.value.tempPrices[store.divisaNivelId] = scDiv;
  }
}

async function saveAllPricesForProduct(): Promise<void> {
  if (!totalizingProduct.value) return;

  totalizingProduct.value.isSaving = true;
  totalizingProduct.value.saveMessage = '';
  totalizingProduct.value.saveError = '';

  const itemsToSave: Array<{ codigo: string; nivel_precio_id: number; moneda_id: number; precio: number }> = [];

  for (const store of STORES) {
    const bsVal = Number(totalizingProduct.value.tempPrices[store.bsNivelId]) || 0;
    const divVal = Number(totalizingProduct.value.tempPrices[store.divisaNivelId]) || 0;

    itemsToSave.push({
      codigo: totalizingProduct.value.codigo,
      nivel_precio_id: store.bsNivelId,
      moneda_id: 1,
      precio: bsVal,
    });
    itemsToSave.push({
      codigo: totalizingProduct.value.codigo,
      nivel_precio_id: store.divisaNivelId,
      moneda_id: 2,
      precio: divVal,
    });
  }

  try {
    const { data } = await apiClient.post<{ updated: number; message: string }>('/productos/precios/batch', {
      items: itemsToSave,
    });

    // Actualizar fila en la tabla reactiva local
    const targetRow = rows.find((r) => r.productId === totalizingProduct.value?.productId);
    if (targetRow) {
      targetRow.pricesMap = { ...totalizingProduct.value.tempPrices };
      targetRow.originalPricesMap = { ...totalizingProduct.value.tempPrices };
      targetRow.isModified = false;
      targetRow.successMessage = 'Precios totalizados y guardados';
      setTimeout(() => {
        targetRow.successMessage = '';
      }, 3000);
    }

    totalizingProduct.value.saveMessage = data.message || 'Todos los precios fueron actualizados exitosamente.';
    setTimeout(() => {
      isProductTotalizeModalOpen.value = false;
      totalizingProduct.value = null;
    }, 1200);
  } catch (err: any) {
    totalizingProduct.value.saveError = err.response?.data?.message || 'Error al guardar los precios del producto.';
  } finally {
    if (totalizingProduct.value) {
      totalizingProduct.value.isSaving = false;
    }
  }
}

function getProductStoreMargin(storeDivisaNivelId: number): number {
  if (!totalizingProduct.value || !totalizingProduct.value.cost) return 0;
  const price = totalizingProduct.value.tempPrices[storeDivisaNivelId] ?? 0;
  return price > 0 ? price - totalizingProduct.value.cost : 0;
}

function getProductStoreMarginPercent(storeDivisaNivelId: number): number {
  if (!totalizingProduct.value || !totalizingProduct.value.cost) return 0;
  const price = totalizingProduct.value.tempPrices[storeDivisaNivelId] ?? 0;
  return price > 0 && totalizingProduct.value.cost > 0
    ? ((price - totalizingProduct.value.cost) / totalizingProduct.value.cost) * 100
    : 0;
}

// Seguimiento global de cambios manuales
const modifiedRows = computed(() => rows.filter((r) => r.isModified));
const modifiedRowsCount = computed(() => modifiedRows.value.length);

function discardAllModifiedRows(): void {
  rows.forEach((r) => {
    if (r.isModified) {
      r.pricesMap = { ...r.originalPricesMap };
      r.isModified = false;
      r.errorMessage = '';
    }
  });
}

async function saveAllModifiedRows(): Promise<void> {
  const modified = modifiedRows.value;
  if (modified.length === 0) return;

  isApplyingBatch.value = true;
  const allItems: Array<{ codigo: string; nivel_precio_id: number; moneda_id: number; precio: number }> = [];

  for (const row of modified) {
    for (const store of STORES) {
      allItems.push({
        codigo: row.codigo,
        nivel_precio_id: store.bsNivelId,
        moneda_id: 1,
        precio: Number(row.pricesMap[store.bsNivelId]) || 0,
      });
      allItems.push({
        codigo: row.codigo,
        nivel_precio_id: store.divisaNivelId,
        moneda_id: 2,
        precio: Number(row.pricesMap[store.divisaNivelId]) || 0,
      });
    }
  }

  try {
    const { data } = await apiClient.post<{ updated: number; message: string }>('/productos/precios/batch', {
      items: allItems,
    });
    modified.forEach((r) => {
      r.originalPricesMap = { ...r.pricesMap };
      r.isModified = false;
      r.successMessage = 'Guardado';
      setTimeout(() => {
        r.successMessage = '';
      }, 3000);
    });
    uploadStatusMessage.value = `✅ Éxito: ${data.message || 'Todos los cambios manuales fueron guardados exitosamente.'}`;
    setTimeout(() => {
      uploadStatusMessage.value = '';
    }, 5000);
  } catch (err: any) {
    uploadErrorMessage.value = err.response?.data?.message || 'Error al guardar los cambios manuales.';
  } finally {
    isApplyingBatch.value = false;
  }
}

const currentSelectedFile = ref<File | null>(null);

// 1. File Selected -> Trigger Preview & Totalization
async function handleFileSelected(event: Event, tipo: 'BS' | 'DIVISA'): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  currentSelectedFile.value = file;
  isUploading.value = true;
  uploadStatusMessage.value = `Leyendo y totalizando archivo Excel de ${tipo === 'BS' ? 'Bolívares (Bs)' : 'Divisas ($)'}...`;
  uploadErrorMessage.value = '';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const { data } = await apiClient.post<Omit<PreviewResult, 'tipo' | 'filename'>>(
      `/productos/precios/preview-excel?tipo=${tipo}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    previewData.value = {
      ...data,
      tipo,
      filename: file.name,
    };
    isPreviewModalOpen.value = true;
    uploadStatusMessage.value = '';
  } catch (err: any) {
    uploadErrorMessage.value = err.response?.data?.message || 'Error al previsualizar el archivo Excel.';
  } finally {
    isUploading.value = false;
    target.value = '';
  }
}

// 2. User confirms preview -> Apply batch update
async function applyExcelUpdate(): Promise<void> {
  if (!previewData.value) return;

  isApplyingBatch.value = true;
  try {
    let resultMessage = '';

    if (currentSelectedFile.value) {
      const formData = new FormData();
      formData.append('file', currentSelectedFile.value);
      const { data } = await apiClient.post<{ updated: number; message: string }>(
        `/productos/precios/upload-excel?tipo=${previewData.value.tipo}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      resultMessage = data.message;
    } else if (previewData.value.rawItems.length) {
      const { data } = await apiClient.post<{ updated: number; message: string }>('/productos/precios/batch', {
        items: previewData.value.rawItems,
      });
      resultMessage = data.message;
    }

    uploadStatusMessage.value = `✅ Éxito: ${resultMessage || 'Precios actualizados correctamente.'}`;
    isPreviewModalOpen.value = false;
    previewData.value = null;
    currentSelectedFile.value = null;
    await reloadProductsAndPrices();

    setTimeout(() => {
      uploadStatusMessage.value = '';
    }, 5000);
  } catch (err: any) {
    uploadErrorMessage.value = err.response?.data?.message || 'Ocurrió un error al aplicar los precios en la base de datos.';
  } finally {
    isApplyingBatch.value = false;
  }
}

// Excel Export Handler (Ordenado por código tal cual en Excel)
async function downloadExcel(tipo: 'BS' | 'DIVISA'): Promise<void> {
  isDownloading.value = true;
  try {
    const response = await apiClient.get(`/productos/precios/export-excel?tipo=${tipo}`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PRECIOS_${tipo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al exportar Excel:', err);
    alert('Error al descargar la plantilla de precios.');
  } finally {
    isDownloading.value = false;
  }
}
</script>

<template>
  <div class="w-full px-2 sm:px-4 py-4 space-y-4">
    <!-- Header Principal -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl bg-white p-5 border border-gray-200/80 shadow-xs">
      <div class="flex items-center gap-3.5">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand/10 to-brand/20 text-brand text-2xl shadow-inner font-bold">
          🏷️
        </div>
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Ajuste y Control de Precios por Tienda
          </h1>
          <p class="text-xs sm:text-sm text-gray-500 mt-0.5">
            Gestión en tiempo real e importación/exportación masiva Excel ordenada por código.
          </p>
        </div>
      </div>

      <!-- Barra de Acciones de Excel (Importar / Exportar) -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Inputs ocultos para adjuntar Excel -->
        <input
          ref="bsFileInput"
          type="file"
          accept=".xlsx, .xls, .csv"
          class="hidden"
          @change="handleFileSelected($event, 'BS')"
        />
        <input
          ref="divisasFileInput"
          type="file"
          accept=".xlsx, .xls, .csv"
          class="hidden"
          @change="handleFileSelected($event, 'DIVISA')"
        />

        <!-- Grupo Importar -->
        <div class="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            :disabled="isUploading"
            class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-xs transition hover:bg-blue-50 disabled:opacity-50 cursor-pointer"
            title="Importar plantilla de precios en Bolívares"
            @click="bsFileInput?.click()"
          >
            <span>📥</span>
            <span>{{ isUploading ? 'Cargando...' : 'Importar Bs' }}</span>
          </button>
          <button
            type="button"
            :disabled="isUploading"
            class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-xs transition hover:bg-emerald-50 disabled:opacity-50 cursor-pointer ml-1"
            title="Importar plantilla de precios en Divisas ($)"
            @click="divisasFileInput?.click()"
          >
            <span>📥</span>
            <span>{{ isUploading ? 'Cargando...' : 'Importar Divisas ($)' }}</span>
          </button>
        </div>

        <!-- Grupo Exportar -->
        <div class="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            :disabled="isDownloading"
            class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            title="Descargar plantilla Excel en Bolívares"
            @click="downloadExcel('BS')"
          >
            <span>📤</span>
            <span>{{ isDownloading ? '...' : 'Exportar Bs' }}</span>
          </button>
          <button
            type="button"
            :disabled="isDownloading"
            class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer ml-1"
            title="Descargar plantilla Excel en Divisas ($)"
            @click="downloadExcel('DIVISA')"
          >
            <span>📤</span>
            <span>{{ isDownloading ? '...' : 'Exportar Divisas' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Feedback Banner de Subida / Error -->
    <div
      v-if="uploadStatusMessage"
      class="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-900 shadow-xs animate-fade-in"
    >
      <div class="flex items-center gap-2.5">
        <span class="text-lg">🚀</span>
        <span>{{ uploadStatusMessage }}</span>
      </div>
      <button
        type="button"
        class="text-xs text-green-700 hover:text-green-900 font-bold underline cursor-pointer"
        @click="uploadStatusMessage = ''"
      >
        Cerrar
      </button>
    </div>

    <div
      v-if="uploadErrorMessage"
      class="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900 shadow-xs animate-fade-in"
    >
      <div class="flex items-center gap-2.5">
        <span class="text-lg">⚠️</span>
        <span>{{ uploadErrorMessage }}</span>
      </div>
      <button
        type="button"
        class="text-xs text-red-700 hover:text-red-900 font-bold underline cursor-pointer"
        @click="uploadErrorMessage = ''"
      >
        Cerrar
      </button>
    </div>

    <!-- Barra de Selección de Tienda / Matriz -->
    <div class="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold uppercase tracking-wider text-gray-500">
            Vista de Precios:
          </span>
          <span class="text-xs font-semibold text-brand">
            {{ selectedStoreKey === 'ALL' ? 'Matriz Completa (Todas las Sucursales)' : activeStore?.name }}
          </span>
        </div>
        <span class="text-xs text-gray-400 font-medium hidden sm:inline">
          💡 Puedes ajustar precios tienda por tienda o ver la matriz general.
        </span>
      </div>

      <div class="flex flex-wrap gap-1.5 sm:gap-2">
        <button
          type="button"
          class="rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-2xs cursor-pointer border"
          :class="
            selectedStoreKey === 'ALL'
              ? 'bg-brand text-white border-brand shadow-sm'
              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
          "
          @click="selectedStoreKey = 'ALL'"
        >
          🌐 Matriz General (Todas)
        </button>

        <button
          v-for="store in STORES"
          :key="store.key"
          type="button"
          class="rounded-xl px-3 py-2 text-xs font-bold transition shadow-2xs cursor-pointer border"
          :class="
            selectedStoreKey === store.key
              ? 'bg-brand text-white border-brand shadow-sm'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          "
          @click="selectedStoreKey = store.key"
        >
          {{ store.name }}
        </button>
      </div>
    </div>

    <!-- Barra de Búsqueda y Filtros de Productos -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
      <div class="flex flex-1 flex-wrap items-center gap-3">
        <!-- Búsqueda por Código -->
        <div class="w-full sm:w-48">
          <input
            v-model="filterCodigo"
            type="text"
            placeholder="Buscar por código..."
            class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-800 placeholder-gray-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <!-- Búsqueda por Descripción -->
        <div class="w-full sm:w-64">
          <input
            v-model="filterNombre"
            type="text"
            placeholder="Buscar por descripción..."
            class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-800 placeholder-gray-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <!-- Filtro de Categorías -->
        <select
          v-model="selectedCategoryId"
          class="rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-700 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="ALL">Todas las Categorías</option>
          <option
            v-for="cat in categoryStore.categoryList"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.nombre }}
          </option>
        </select>

        <!-- Filtro con o sin precio -->
        <select
          v-model="priceStatusFilter"
          class="rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-700 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="ALL">Todos los Estados</option>
          <option value="WITH_PRICE">Solo con Precios</option>
          <option value="WITHOUT_PRICE">Sin Precios Asignados</option>
        </select>

        <!-- Botón limpiar filtros -->
        <button
          v-if="filterCodigo || filterNombre || selectedCategoryId !== 'ALL' || priceStatusFilter !== 'ALL'"
          type="button"
          class="text-xs font-bold text-brand hover:underline cursor-pointer"
          @click="resetFilters"
        >
          Limpiar Filtros
        </button>
      </div>

      <!-- Resumen / Conteo -->
      <div class="text-xs font-semibold text-gray-500 whitespace-nowrap">
        Mostrando <span class="font-bold text-gray-900">{{ pagination.rangeStart.value }}</span> -
        <span class="font-bold text-gray-900">{{ pagination.rangeEnd.value }}</span> de
        <span class="font-bold text-gray-900">{{ pagination.totalItems.value.toLocaleString() }}</span>
      </div>
    </div>

    <!-- CASO 1: VISTA POR TIENDA INDIVIDUAL -->
    <div
      v-if="selectedStoreKey !== 'ALL' && activeStore"
      class="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-xs"
    >
      <div class="border-b border-gray-100 bg-slate-50/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1.5 font-bold text-sm text-gray-800">
            🏬 Precios para: <b class="text-brand">{{ activeStore.name }}</b>
          </span>
          <span class="text-xs text-gray-500 font-medium">({{ filteredRows.length.toLocaleString() }} productos encontrados)</span>
        </div>
        <div class="flex items-center gap-4 text-xs font-bold">
          <span class="inline-flex items-center gap-1.5 text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
            <span class="h-2 w-2 rounded-full bg-blue-600"></span> 🔵 Precio Bs
          </span>
          <span class="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
            <span class="h-2 w-2 rounded-full bg-emerald-600"></span> 🟢 Precio Divisas ($)
          </span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50/90 text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 select-none">
              <th class="px-5 py-3 font-bold w-36">Código</th>
              <th class="px-5 py-3 font-bold">Descripción</th>
              <th class="px-5 py-3 font-bold text-blue-800 text-center w-40">Precio Bs</th>
              <th class="px-5 py-3 font-bold text-emerald-800 text-center w-40">Precio Divisa</th>
              <th class="px-5 py-3 font-bold text-center w-44">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="row in pagination.pageItems.value"
              :key="row.productId"
              class="hover:bg-slate-50/80 transition"
              :class="{ 'bg-amber-50/30': row.isModified }"
            >
              <td class="px-5 py-3">
                <span class="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded-md border border-slate-200">
                  {{ row.codigo }}
                </span>
              </td>
              <td class="px-5 py-3 font-medium text-gray-900">{{ row.nombre }}</td>
              <td class="px-5 py-3 text-center">
                <input
                  :value="row.pricesMap[activeStore.bsNivelId] ?? 0"
                  type="number"
                  class="w-24 px-2 py-1 text-right font-mono text-xs border rounded-lg focus:ring-1 focus:ring-brand outline-none"
                  @change="savePrice(row, activeStore.bsNivelId, Number(($event.target as HTMLInputElement).value), 1)"
                />
              </td>
              <td class="px-5 py-3 text-center">
                <input
                  :value="row.pricesMap[activeStore.divisaNivelId] ?? 0"
                  type="number"
                  class="w-24 px-2 py-1 text-right font-mono text-xs border rounded-lg focus:ring-1 focus:ring-brand outline-none"
                  @change="savePrice(row, activeStore.divisaNivelId, Number(($event.target as HTMLInputElement).value), 2)"
                />
              </td>
              <td class="px-5 py-3 text-center flex justify-center gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                  @click="openProductTotalization(row)"
                >
                  Totalizar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        :page="pagination.page.value"
        :total-pages="pagination.totalPages.value"
        :range-start="pagination.rangeStart.value"
        :range-end="pagination.rangeEnd.value"
        :page-size="pagination.pageSize.value"
        @update:page="pagination.page.value = $event"
        @update:pageSize="pagination.pageSize.value = $event"
        :total-items="pagination.totalItems.value"
      />
    </div>

    <!-- CASO 2: VISTA MATRIZ GENERAL (EN ORDEN OFICIAL - ULTRA COMPACTA Y STICKY) -->
    <div v-else class="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="bg-gray-100 text-center uppercase tracking-wide text-gray-700 font-bold border-b border-gray-200 select-none">
              <!-- Columna Sticky Izquierda: Código & Producto -->
              <th
                rowspan="2"
                class="sticky left-0 z-30 px-3 py-2 text-left font-bold text-gray-800 bg-gray-100 border-r border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] hover:bg-gray-200 cursor-pointer transition min-w-[200px] max-w-[220px]"
                @click="toggleSort('codigo')"
              >
                <div class="flex items-center justify-between">
                  <span>Código & Producto</span>
                  <span v-if="sortKey === 'codigo'" class="text-brand font-black">
                    {{ sortOrder === 'asc' ? '▲' : '▼' }}
                  </span>
                </div>
              </th>

              <!-- Encabezados de Tiendas -->
              <th
                v-for="store in STORES"
                :key="store.key"
                colspan="2"
                class="px-1.5 py-1.5 border-r border-gray-200 text-center text-[11px] font-bold"
                :class="store.colorClass"
              >
                {{ store.shortName }}
              </th>

              <!-- Columna Sticky Derecha: Estado & Guardar -->
              <th rowspan="2" class="sticky right-0 z-30 px-2 py-2 text-center font-bold text-gray-800 bg-gray-100 border-l border-gray-300 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[130px]">
                Estado / Guardar
              </th>
            </tr>
            <tr class="bg-gray-50 text-center uppercase tracking-wider text-[10px] text-gray-500 border-b border-gray-200">
              <template v-for="store in STORES" :key="store.key + '-sub'">
                <th class="px-1 py-1 text-blue-700 font-bold bg-blue-50/70">Bs.</th>
                <th class="px-1 py-1 text-emerald-700 font-bold bg-emerald-50/70 border-r border-gray-200">Div $</th>
              </template>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="row in pagination.pageItems.value"
              :key="row.productId"
              class="group hover:bg-slate-50 transition"
              :class="{ 'bg-amber-50/40': row.isModified }"
            >
              <!-- Celda Sticky Izquierda: Código, Botón Totalizar y Nombre -->
              <td
                class="sticky left-0 z-20 px-2.5 py-1.5 border-r border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] max-w-[220px] transition"
                :class="row.isModified ? 'bg-amber-50/90' : 'bg-white group-hover:bg-slate-50'"
              >
                <div class="flex items-center justify-between gap-1 mb-0.5">
                  <span class="font-mono font-bold text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 inline-block truncate max-w-[110px]">
                    {{ row.codigo }}
                  </span>
                  <button
                    type="button"
                    class="inline-flex items-center gap-0.5 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs hover:bg-blue-700 transition cursor-pointer shrink-0"
                    title="Totalizar precios y ver estadísticas de este producto"
                    @click="openProductTotalization(row)"
                  >
                    <span>📊</span>
                    <span>Totalizar</span>
                  </button>
                </div>
                <p class="text-[11px] font-medium text-gray-800 truncate" :title="row.nombre">{{ row.nombre }}</p>
              </td>

              <!-- Celdas de Precios por Tienda (Compactas) -->
              <template v-for="store in STORES" :key="store.key + '-' + row.productId">
                <td class="p-1 text-center bg-blue-50/5">
                  <input
                    :value="row.pricesMap[store.bsNivelId] ?? 0"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-13 sm:w-14 rounded border border-gray-200 px-0.5 py-0.5 text-center font-mono font-bold text-[11px] text-blue-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    @input="onPriceInput(row, store.bsNivelId, $event)"
                    @change="savePrice(row, store.bsNivelId, Number(($event.target as HTMLInputElement).value), 1)"
                  />
                </td>
                <td class="p-1 text-center border-r border-gray-200 bg-emerald-50/5">
                  <input
                    :value="row.pricesMap[store.divisaNivelId] ?? 0"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-13 sm:w-14 rounded border border-gray-200 px-0.5 py-0.5 text-center font-mono font-bold text-[11px] text-emerald-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                    @input="onPriceInput(row, store.divisaNivelId, $event)"
                    @change="savePrice(row, store.divisaNivelId, Number(($event.target as HTMLInputElement).value), 2)"
                  />
                </td>
              </template>

              <!-- Celda Sticky Derecha: Guardar y Descartar -->
              <td
                class="sticky right-0 z-20 px-2 py-1.5 border-l border-gray-300 text-center shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] transition"
                :class="row.isModified ? 'bg-amber-50/90' : 'bg-white group-hover:bg-slate-50'"
              >
                <div class="flex items-center justify-center gap-1">
                  <template v-if="row.isModified">
                    <button
                      type="button"
                      :disabled="row.isSaving"
                      class="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition cursor-pointer animate-pulse"
                      title="Guardar cambios de este producto"
                      @click="saveRowPrices(row)"
                    >
                      <span>💾</span>
                      <span>{{ row.isSaving ? '...' : 'Guardar' }}</span>
                    </button>

                    <button
                      type="button"
                      class="inline-flex items-center gap-0.5 rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                      title="Descartar cambios y revertir a los precios anteriores"
                      @click="discardRowChanges(row)"
                    >
                      <span>↩</span>
                    </button>
                  </template>

                  <span v-else-if="row.successMessage" class="text-xs font-bold text-emerald-600">
                    ✓ Guardado
                  </span>
                  <span v-else class="text-[10px] text-gray-400 font-medium">
                    Al día
                  </span>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td :colspan="2 + STORES.length * 2" class="px-5 py-12 text-center text-sm text-gray-400">
                <div class="flex flex-col items-center justify-center gap-2">
                  <span class="text-3xl">🔍</span>
                  <p class="font-bold text-gray-700">No se encontraron productos coincidentes</p>
                  <p class="text-xs text-gray-400">Intenta ajustar o limpiar los filtros de búsqueda.</p>
                  <button
                    type="button"
                    class="mt-2 rounded-lg bg-brand/10 px-3 py-1 text-xs font-bold text-brand hover:bg-brand/20 transition cursor-pointer"
                    @click="resetFilters"
                  >
                    Restablecer filtros
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        :page="pagination.page.value"
        :total-pages="pagination.totalPages.value"
        :range-start="pagination.rangeStart.value"
        :range-end="pagination.rangeEnd.value"
        :page-size="pagination.pageSize.value"
        @update:page="pagination.page.value = $event"
        @update:pageSize="pagination.pageSize.value = $event"
        :total-items="pagination.totalItems.value"
      />
    </div>

    <!-- MODAL DE PREVISUALIZACIÓN Y TOTALIZACIÓN DE EXCEL -->
    <div
      v-if="isPreviewModalOpen && previewData"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-fade-in">
        <!-- Modal Header -->
        <div class="border-b border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand text-lg font-bold">
              📊
            </span>
            <div>
              <h2 class="text-base font-bold text-gray-900">
                Previsualización y Totalización de Precios Excel
              </h2>
              <p class="text-xs text-gray-500 font-mono">
                Archivo: {{ previewData.filename }} (Lista en {{ previewData.tipo === 'BS' ? 'Bolívares - Bs' : 'Divisas - USD' }})
              </p>
            </div>
          </div>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 text-lg p-1"
            @click="isPreviewModalOpen = false; previewData = null"
          >
            ✕
          </button>
        </div>

        <!-- Modal Body: Estadísticas y Muestra -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Totalizadores Clave -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <span class="text-xs font-semibold uppercase text-blue-600">Total Productos</span>
              <p class="mt-1 text-2xl font-black text-blue-950 font-mono">
                {{ previewData.totalProducts.toLocaleString() }}
              </p>
              <p class="mt-0.5 text-[11px] text-blue-700">Productos identificados en el archivo</p>
            </div>

            <div class="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <span class="text-xs font-semibold uppercase text-emerald-600">Total Precios a Insertar</span>
              <p class="mt-1 text-2xl font-black text-emerald-950 font-mono">
                {{ previewData.totalPriceEntries.toLocaleString() }}
              </p>
              <p class="mt-0.5 text-[11px] text-emerald-700">Filas de precios por tienda a actualizar</p>
            </div>

            <div class="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
              <span class="text-xs font-semibold uppercase text-purple-600">Tipo de Lista</span>
              <p class="mt-1 text-lg font-bold text-purple-950">
                {{ previewData.tipo === 'BS' ? '🔵 Precios en Bs (Facturado)' : '🟢 Precios en Divisas ($)' }}
              </p>
              <p class="mt-0.5 text-[11px] text-purple-700">Moneda base: {{ previewData.tipo === 'BS' ? 'VES' : 'USD' }}</p>
            </div>
          </div>

          <!-- Tiendas Incluidas en este archivo -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Tiendas que se actualizarán:
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="store in STORES"
                :key="store.key"
                class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700"
              >
                <span class="h-2 w-2 rounded-full bg-brand"></span>
                {{ store.name }}
              </span>
            </div>
          </div>

          <!-- Muestra de Previsualización -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500">
                Muestra de Datos (Primeros productos detectados):
              </h3>
              <span class="text-[11px] text-gray-400">Mostrando {{ previewData.sampleItems.length }} de {{ previewData.totalProducts }}</span>
            </div>

            <div class="overflow-x-auto rounded-xl border border-gray-200">
              <table class="w-full text-left text-xs">
                <thead class="bg-gray-50 text-gray-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th class="px-3 py-2 border-r border-gray-200">Código</th>
                    <th class="px-3 py-2 border-r border-gray-200">Descripción</th>
                    <th
                      v-for="store in (previewData.tipo === 'DIVISA' ? STORES.filter(s => s.key !== 'GUAYANA') : STORES)"
                      :key="store.key"
                      class="px-3 py-2 text-center"
                    >
                      <span class="block text-[11px] font-bold text-gray-800">{{ store.name }}</span>
                      <span class="block text-[9px] font-normal text-gray-400 uppercase">
                        {{ previewData.tipo === 'BS' ? 'Bs. Facturado' : 'Divisa ($)' }}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="item in previewData.sampleItems" :key="item.codigo" class="hover:bg-gray-50">
                    <td class="px-3 py-2 font-mono font-bold text-gray-800 border-r border-gray-200">{{ item.codigo }}</td>
                    <td class="px-3 py-2 text-gray-700 truncate max-w-xs border-r border-gray-200">{{ item.nombre }}</td>
                    <td
                      v-for="store in (previewData.tipo === 'DIVISA' ? STORES.filter(s => s.key !== 'GUAYANA') : STORES)"
                      :key="store.key"
                      class="px-3 py-2 text-center font-mono font-bold"
                      :class="previewData.tipo === 'BS' ? 'text-blue-900 bg-blue-50/10' : 'text-emerald-900 bg-emerald-50/10'"
                    >
                      {{ previewData.tipo === 'BS' ? 'Bs.' : '$' }}
                      {{ (item.precios[previewData.tipo === 'BS' ? store.bsNivelId : store.divisaNivelId] ?? 0).toFixed(2) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Modal Footer: Botones de Acción -->
        <div class="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            :disabled="isApplyingBatch"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
            @click="isPreviewModalOpen = false; previewData = null"
          >
            Cancelar
          </button>

          <button
            type="button"
            :disabled="isApplyingBatch"
            class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            @click="applyExcelUpdate"
          >
            <span v-if="isApplyingBatch" class="animate-spin">⏳</span>
            <span v-else>🚀</span>
            <span>{{ isApplyingBatch ? 'Totalizando y Aplicando...' : 'Totalizar y Actualizar Precios Ahora' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DE TOTALIZACIÓN Y AJUSTE POR PRODUCTO INDIVIDUAL -->
    <div
      v-if="isProductTotalizeModalOpen && totalizingProduct"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-fade-in">
        <!-- Modal Header -->
        <div class="border-b border-gray-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand text-xl font-bold shadow-inner">
              🏷️
            </span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                  {{ totalizingProduct.codigo }}
                </span>
                <span class="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-200">
                  {{ totalizingProduct.categoriaNombre }}
                </span>
              </div>
              <h2 class="text-base font-bold text-gray-900 mt-0.5">
                {{ totalizingProduct.nombre }}
              </h2>
            </div>
          </div>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 text-lg p-1 cursor-pointer"
            @click="isProductTotalizeModalOpen = false; totalizingProduct = null"
          >
            ✕
          </button>
        </div>

        <!-- Modal Body: Estadísticas y Edición por Sucursal -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Totalizadores Clave del Producto -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <!-- Costo Base -->
            <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <span class="text-[11px] font-bold uppercase text-slate-600">Costo Base ($)</span>
              <p class="mt-1 text-xl font-black text-slate-900 font-mono">
                ${{ (totalizingProduct.cost || 0).toFixed(2) }}
              </p>
              <p class="text-[10px] text-slate-500">Costo de compra registrado</p>
            </div>

            <!-- Promedio Divisas -->
            <div class="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
              <span class="text-[11px] font-bold uppercase text-emerald-700">Precio Promedio ($)</span>
              <p class="mt-1 text-xl font-black text-emerald-950 font-mono">
                ${{ productTotalizeStats.avgDivisa.toFixed(2) }}
              </p>
              <p class="text-[10px] text-emerald-700">
                Rango: ${{ productTotalizeStats.minDivisa.toFixed(2) }} - ${{ productTotalizeStats.maxDivisa.toFixed(2) }}
              </p>
            </div>

            <!-- Margen Promedio % -->
            <div class="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
              <span class="text-[11px] font-bold uppercase text-blue-700">Margen Promedio</span>
              <p class="mt-1 text-xl font-black text-blue-950 font-mono">
                {{ productTotalizeStats.avgMarginPercent > 0 ? '+' : '' }}{{ productTotalizeStats.avgMarginPercent.toFixed(1) }}%
              </p>
              <p class="text-[10px] text-blue-700">
                Ganancia aprox: +${{ productTotalizeStats.avgProfitUsd.toFixed(2) }} / unid.
              </p>
            </div>

            <!-- Cobertura de Sucursales -->
            <div class="rounded-xl border border-purple-100 bg-purple-50/50 p-3.5">
              <span class="text-[11px] font-bold uppercase text-purple-700">Cobertura Tiendas</span>
              <p class="mt-1 text-xl font-black text-purple-950 font-mono">
                {{ productTotalizeStats.configuredDivisaCount }} / {{ STORES.length }}
              </p>
              <p class="text-[10px] text-purple-700">Tiendas con precio fijado</p>
            </div>
          </div>

          <!-- Barra de Herramientas de Asignación Rápida -->
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-100/70 p-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-700">⚡ Ajuste por Margen Global:</span>
              <div class="flex items-center gap-1.5 bg-white rounded-lg border border-slate-300 px-2 py-1 shadow-2xs">
                <input
                  v-model.number="targetMarginPercent"
                  type="number"
                  min="0"
                  step="1"
                  class="w-14 text-center font-mono font-bold text-xs outline-none"
                />
                <span class="text-xs font-bold text-slate-500">%</span>
              </div>
              <button
                type="button"
                :disabled="!totalizingProduct.cost"
                class="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                @click="applyTargetMarginToAll"
              >
                Aplicar Margen a Todas ($)
              </button>
            </div>

            <button
              type="button"
              class="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              @click="replicateScToAll"
            >
              🔄 Replicar Precios de San Cristóbal a Todas
            </button>
          </div>

          <!-- Feedback en Modal -->
          <div
            v-if="totalizingProduct.saveMessage"
            class="rounded-lg bg-green-50 p-3 text-xs font-bold text-green-800 border border-green-200"
          >
            ✓ {{ totalizingProduct.saveMessage }}
          </div>
          <div
            v-if="totalizingProduct.saveError"
            class="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-800 border border-red-200"
          >
            ⚠️ {{ totalizingProduct.saveError }}
          </div>

          <!-- Tabla de Precios por Sucursal -->
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full text-xs">
              <thead class="bg-gray-50 uppercase text-[10px] text-gray-600 font-bold border-b border-gray-200">
                <tr>
                  <th class="px-4 py-2.5 text-left">Sucursal / Almacén</th>
                  <th class="px-3 py-2.5 text-center text-blue-700 bg-blue-50/50">Precio Bs.</th>
                  <th class="px-3 py-2.5 text-center text-emerald-700 bg-emerald-50/50">Precio Divisa ($)</th>
                  <th class="px-3 py-2.5 text-center">Margen ($)</th>
                  <th class="px-3 py-2.5 text-center">Margen (%)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="store in STORES" :key="store.key" class="hover:bg-slate-50">
                  <td class="px-4 py-2.5">
                    <span class="inline-block px-2 py-0.5 rounded text-[11px] font-bold" :class="store.badgeBg">
                      {{ store.name }}
                    </span>
                  </td>

                  <!-- Input Bs -->
                  <td class="px-3 py-2 text-center bg-blue-50/10">
                    <div class="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 shadow-2xs">
                      <span class="text-[10px] font-bold text-blue-600">Bs.</span>
                      <input
                        v-model.number="totalizingProduct.tempPrices[store.bsNivelId]"
                        type="number"
                        min="0"
                        step="0.01"
                        class="w-20 text-right font-mono font-bold text-xs text-blue-900 outline-none"
                      />
                    </div>
                  </td>

                  <!-- Input Divisa $ -->
                  <td class="px-3 py-2 text-center bg-emerald-50/10">
                    <div class="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 shadow-2xs">
                      <span class="text-[10px] font-bold text-emerald-600">$</span>
                      <input
                        v-model.number="totalizingProduct.tempPrices[store.divisaNivelId]"
                        type="number"
                        min="0"
                        step="0.01"
                        class="w-20 text-right font-mono font-bold text-xs text-emerald-900 outline-none"
                      />
                    </div>
                  </td>

                  <!-- Margen en $ -->
                  <td class="px-3 py-2 text-center font-mono font-semibold">
                    <template v-if="(totalizingProduct.tempPrices[store.divisaNivelId] || 0) > 0 && totalizingProduct.cost > 0">
                      <span :class="getProductStoreMargin(store.divisaNivelId) >= 0 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'">
                        ${{ getProductStoreMargin(store.divisaNivelId).toFixed(2) }}
                      </span>
                    </template>
                    <span v-else class="text-gray-300">—</span>
                  </td>

                  <!-- Margen en % -->
                  <td class="px-3 py-2 text-center font-mono font-semibold">
                    <template v-if="(totalizingProduct.tempPrices[store.divisaNivelId] || 0) > 0 && totalizingProduct.cost > 0">
                      <span
                        class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                        :class="getProductStoreMarginPercent(store.divisaNivelId) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                      >
                        {{ getProductStoreMarginPercent(store.divisaNivelId) >= 0 ? '+' : '' }}{{ getProductStoreMarginPercent(store.divisaNivelId).toFixed(1) }}%
                      </span>
                    </template>
                    <span v-else class="text-gray-300">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Footer: Botones de Acción -->
        <div class="border-t border-gray-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            :disabled="totalizingProduct.isSaving"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
            @click="isProductTotalizeModalOpen = false; totalizingProduct = null"
          >
            Cancelar
          </button>

          <button
            type="button"
            :disabled="totalizingProduct.isSaving"
            class="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-brand/90 disabled:opacity-50 cursor-pointer"
            @click="saveAllPricesForProduct"
          >
            <span v-if="totalizingProduct.isSaving" class="animate-spin">⏳</span>
            <span v-else>💾</span>
            <span>{{ totalizingProduct.isSaving ? 'Guardando...' : 'Guardar y Totalizar Todos los Precios' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- BARRA FLOTANTE DE CAMBIOS MANUALES PENDIENTES -->
    <div
      v-if="modifiedRowsCount > 0"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl bg-gray-900 px-6 py-3.5 text-white shadow-2xl border border-gray-700 animate-fade-in"
    >
      <div class="flex items-center gap-2.5">
        <span class="text-xl">⚠️</span>
        <span class="text-sm font-semibold">
          Tienes <b class="text-amber-400 font-mono">{{ modifiedRowsCount }}</b> producto(s) con cambios manuales pendientes
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="isApplyingBatch"
          class="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer flex items-center gap-1.5"
          @click="saveAllModifiedRows"
        >
          <span>💾</span>
          <span>{{ isApplyingBatch ? 'Guardando...' : 'Guardar y Totalizar Todos' }}</span>
        </button>
        <button
          type="button"
          class="rounded-xl bg-gray-800 hover:bg-gray-700 px-3.5 py-2 text-xs font-medium text-gray-200 transition cursor-pointer flex items-center gap-1 border border-gray-700"
          title="Descartar todos los cambios y volver a los valores anteriores"
          @click="discardAllModifiedRows"
        >
          <span>↩</span>
          <span>Descartar Todos</span>
        </button>
      </div>
    </div>
  </div>
</template>
