<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import apiClient from '@/api/axios-client';
import { exportToCsv } from '@/utils/csv-export';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useSucursalStore } from '@/modules/master/sucursales/interfaces/sucursal.store';
import { useVendedorStore } from '@/modules/master/vendedores/interfaces/vendedor.store';
import { useUsuarioStore } from '@/modules/master/usuarios/interfaces/usuario.store';

interface CierreOperaciones {
  totalVentasBrutas: number;
  totalDescuentos: number;
  totalIva: number;
  totalIgtf: number;
  totalContado: number;
  totalCredito: number;
  totalTransacciones: number;
  totalGravable: number;
  totalExento: number;
  totalEfectivo: number;
  totalNumeroCheques: number;
  totalCheques: number;
  totalOtrasFormasPago: number;
  totalIngresos: number;
}

interface OperacionesCxC {
  numeroFacturas: number;
  numeroPagosRecibidos: number;
  montoPagosRecibidos: number;
  totalEfectivo: number;
  totalOtrasFormasPago: number;
  totalIngresos: number;
}

interface TransaccionDia {
  id: number;
  documento: string;
  numeroControl?: string;
  descripcion: string;
  montoNeto: number;
  impuestos: number;
  contado: number;
  credito: number;
  totalNeto: number;
  status: string;
  condicion: string;
  fechaEmision: string;
  fechaVencimiento: string;
}

interface FormaPagoDetalle {
  descripcion: string;
  monto: number;
  montoDivisas: number;
  igtf: number;
  cantidad: number;
}

interface DailyReportResponse {
  fecha: string;
  moneda: string;
  empresa: string;
  cierreOperaciones: CierreOperaciones;
  operacionesCxC: OperacionesCxC;
  transacciones: TransaccionDia[];
  otrasFormasPagoDetalle: FormaPagoDetalle[];
}

const currenciesStore = useCurrenciesStore();
const sucursalStore = useSucursalStore();
const vendedorStore = useVendedorStore();
const usuarioStore = useUsuarioStore();

// ─── Parámetros del Formulario ────────────────────────────────────────────────
const fechaDesde = ref<string>(new Date().toISOString().slice(0, 10));
const fechaHasta = ref<string>('');
const selectedSucursalId = ref<string>('ALL');
const selectedMonedaId = ref<string>('ALL');
const selectedUsuarioIds = ref<number[]>([]);
const selectedVendedorIds = ref<number[]>([]);

const activarMonedas = ref<boolean>(true);
const expresarEnMonedaLocal = ref<boolean>(false);

// Checkboxes de desglose (sin cheques)
const optDetallarVentasDia = ref<boolean>(true);
const optDetallarOtrasFormasPago = ref<boolean>(true);
const optDetallarRecibosCaja = ref<boolean>(true);
const optDetallarTarjetas = ref<boolean>(true);
const optDetallarDepositos = ref<boolean>(false);
const optDetallarProductos = ref<boolean>(false);
const optIncluirCostos = ref<boolean>(false);

// Estado de UI
const showOptions = ref<boolean>(false);
const showUserDropdown = ref<boolean>(false);
const showVendedorDropdown = ref<boolean>(false);
const searchTerm = ref<string>('');
const userSearchTerm = ref<string>('');
const vendedorSearchTerm = ref<string>('');
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);

const reportData = ref<DailyReportResponse>({
  fecha: new Date().toISOString().slice(0, 10),
  moneda: 'Dólares',
  empresa: 'ERP BUSINESS, C.A.',
  cierreOperaciones: {
    totalVentasBrutas: 0,
    totalDescuentos: 0,
    totalIva: 0,
    totalIgtf: 0,
    totalContado: 0,
    totalCredito: 0,
    totalTransacciones: 0,
    totalGravable: 0,
    totalExento: 0,
    totalEfectivo: 0,
    totalNumeroCheques: 0,
    totalCheques: 0,
    totalOtrasFormasPago: 0,
    totalIngresos: 0,
  },
  operacionesCxC: {
    numeroFacturas: 0,
    numeroPagosRecibidos: 0,
    montoPagosRecibidos: 0,
    totalEfectivo: 0,
    totalOtrasFormasPago: 0,
    totalIngresos: 0,
  },
  transacciones: [],
  otrasFormasPagoDetalle: [],
});

// ─── Formateadores Numéricos ──────────────────────────────────────────────────
function formatMoney(value: number | string | undefined | null): string {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

const currentFormattedTime = computed(() => {
  const now = new Date();
  return now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
});

// ─── Computed KPIs ─────────────────────────────────────────────────────────────
const ventaNetaTotal = computed(() => {
  return (
    (reportData.value.cierreOperaciones.totalVentasBrutas || 0) -
    (reportData.value.cierreOperaciones.totalDescuentos || 0)
  );
});

// ─── Petición al Backend ───────────────────────────────────────────────────────
async function fetchDailyReport(): Promise<void> {
  isLoading.value = true;
  error.value = null;

  try {
    const params: Record<string, any> = {
      fecha: fechaDesde.value,
    };

    if (fechaHasta.value) {
      params.fecha_desde = fechaDesde.value;
      params.fecha_hasta = fechaHasta.value;
    }

    if (selectedSucursalId.value && selectedSucursalId.value !== 'ALL') {
      params.sucursal_id = selectedSucursalId.value;
    }

    if (selectedMonedaId.value && selectedMonedaId.value !== 'ALL') {
      params.moneda_id = selectedMonedaId.value;
    }

    if (selectedUsuarioIds.value.length > 0) {
      params.usuario_ids = selectedUsuarioIds.value.join(',');
    }

    if (selectedVendedorIds.value.length > 0) {
      params.vendedor_ids = selectedVendedorIds.value.join(',');
    }

    const res = await apiClient.get<DailyReportResponse>('/facturas/reporte-diario', { params });
    if (res.data) {
      reportData.value = res.data;
    }
  } catch (err: any) {
    console.error('Error al cargar reporte diario:', err);
    error.value = 'No se pudo cargar el reporte diario. Revisa la conexión con el servidor.';
  } finally {
    isLoading.value = false;
  }
}

// ─── Filtros de Usuarios y Vendedores ─────────────────────────────────────────
const filteredUsuarios = computed(() => {
  const term = userSearchTerm.value.trim().toLowerCase();
  const list = usuarioStore.usuarioList || [];
  if (!term) return list;
  return list.filter(
    (u) =>
      u.nombreCompleto?.toLowerCase().includes(term) ||
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term),
  );
});

function toggleUsuario(id: number) {
  const idx = selectedUsuarioIds.value.indexOf(id);
  if (idx >= 0) {
    selectedUsuarioIds.value.splice(idx, 1);
  } else {
    selectedUsuarioIds.value.push(id);
  }
}

function isUsuarioSelected(id: number): boolean {
  return selectedUsuarioIds.value.includes(id);
}

function clearUsuarios() {
  selectedUsuarioIds.value = [];
}

const filteredVendedores = computed(() => {
  const term = vendedorSearchTerm.value.trim().toLowerCase();
  const list = vendedorStore.vendedorList || [];
  if (!term) return list;
  return list.filter(
    (v) =>
      v.nombre?.toLowerCase().includes(term) ||
      v.codigo?.toLowerCase().includes(term) ||
      v.telefono?.toLowerCase().includes(term),
  );
});

function toggleVendedor(id: number) {
  const idx = selectedVendedorIds.value.indexOf(id);
  if (idx >= 0) {
    selectedVendedorIds.value.splice(idx, 1);
  } else {
    selectedVendedorIds.value.push(id);
  }
}

function isVendedorSelected(id: number): boolean {
  return selectedVendedorIds.value.includes(id);
}

function clearVendedores() {
  selectedVendedorIds.value = [];
}

// ─── Restablecer Filtros ──────────────────────────────────────────────────────
function resetFilters() {
  fechaDesde.value = new Date().toISOString().slice(0, 10);
  fechaHasta.value = '';
  selectedSucursalId.value = 'ALL';
  selectedMonedaId.value = 'ALL';
  selectedUsuarioIds.value = [];
  selectedVendedorIds.value = [];
  searchTerm.value = '';
  userSearchTerm.value = '';
  vendedorSearchTerm.value = '';
  fetchDailyReport();
}

// ─── Filtro de Búsqueda de Transacciones ──────────────────────────────────────
const filteredTransacciones = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  if (!term) return reportData.value.transacciones;
  return reportData.value.transacciones.filter(
    (t) =>
      t.documento.toLowerCase().includes(term) ||
      t.descripcion.toLowerCase().includes(term) ||
      (t.numeroControl && t.numeroControl.toLowerCase().includes(term)),
  );
});

const transaccionesTotales = computed(() => {
  return filteredTransacciones.value.reduce(
    (acc, t) => {
      acc.montoNeto += t.montoNeto;
      acc.impuestos += t.impuestos;
      acc.contado += t.contado;
      acc.credito += t.credito;
      return acc;
    },
    { montoNeto: 0, impuestos: 0, contado: 0, credito: 0 },
  );
});

const otrasFormasTotales = computed(() => {
  return reportData.value.otrasFormasPagoDetalle.reduce(
    (acc, row) => {
      acc.monto += row.monto;
      acc.montoDivisas += row.montoDivisas;
      acc.igtf += row.igtf;
      return acc;
    },
    { monto: 0, montoDivisas: 0, igtf: 0 },
  );
});

function handleExportExcel(): void {
  const headers = ['Documento', 'Descripción', 'Monto Neto (Base - Desc)', 'Impuestos (IVA + IGTF)', 'Contado', 'Crédito', 'Estado'];
  const rows = reportData.value.transacciones.map((t) => [
    t.documento,
    t.descripcion,
    t.montoNeto.toFixed(2),
    t.impuestos.toFixed(2),
    t.contado.toFixed(2),
    t.credito.toFixed(2),
    t.status,
  ]);
  exportToCsv(`Reporte_Ventas_Diarias_${fechaDesde.value}`, headers, rows);
}

function handlePrint(): void {
  window.print();
}

onMounted(() => {
  if (currenciesStore.currencies.length === 0) currenciesStore.fetchCurrencies();
  if (sucursalStore.sucursalList.length === 0) sucursalStore.fetchSucursales();
  if (vendedorStore.vendedorList.length === 0) vendedorStore.fetchVendedores();
  if (usuarioStore.usuarioList.length === 0) usuarioStore.fetchUsuarios();
  fetchDailyReport();
});
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- ══════════════════════════════════════════════════════════════════════════
         PANEL DE PARÁMETROS MINIMALISTA Y ELEGANTE
         ══════════════════════════════════════════════════════════════════════════ -->
    <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all print:hidden">
      <!-- Header de la barra de filtros -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 class="text-base font-bold tracking-tight text-slate-900">
            Reporte de Ventas Diarias
          </h2>
          <p class="text-xs text-slate-500">
            Filtra por fecha, sucursal, cajeros y asesores para generar el balance del día.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            @click="showOptions = !showOptions"
          >
            <svg class="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>{{ showOptions ? 'Ocultar Opciones' : 'Más Opciones' }}</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            title="Restablecer filtros"
            @click="resetFilters"
          >
            <svg class="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Restablecer</span>
          </button>
        </div>
      </div>

      <!-- Barra de Filtros Principales -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
        <!-- Fecha Desde -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Fecha Desde
          </label>
          <input
            v-model="fechaDesde"
            type="date"
            class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <!-- Fecha Hasta -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Fecha Hasta <span class="text-slate-400 font-normal lowercase">(opcional)</span>
          </label>
          <input
            v-model="fechaHasta"
            type="date"
            class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <!-- Sucursal -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Estación / Sucursal
          </label>
          <select
            v-model="selectedSucursalId"
            class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
          >
            <option value="ALL">Todas las Estaciones</option>
            <option v-for="s in sucursalStore.sucursalList" :key="s.id" :value="s.id">
              {{ s.nombre }} [{{ s.siglas || s.codigo }}]
            </option>
          </select>
        </div>

        <!-- Moneda -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Moneda Base
          </label>
          <select
            v-model="selectedMonedaId"
            class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
          >
            <option value="ALL">Dólares (Moneda Ref)</option>
            <option v-for="m in currenciesStore.currencies" :key="m.id" :value="m.id">
              {{ m.name }} ({{ m.code }})
            </option>
          </select>
        </div>
      </div>

      <!-- Fila de Selección Múltiple Compacta (Usuarios / Vendedores) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3">
        <!-- Multi-select Usuarios -->
        <div class="relative">
          <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Cajeros / Usuarios
          </label>
          <div
            class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs cursor-pointer hover:bg-slate-100/60 transition"
            @click="showUserDropdown = !showUserDropdown"
          >
            <div class="flex items-center gap-1.5 truncate">
              <span v-if="selectedUsuarioIds.length === 0" class="text-slate-500 font-medium">Todos los usuarios</span>
              <span v-else class="inline-flex items-center rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                {{ selectedUsuarioIds.length }} seleccionado(s)
              </span>
            </div>
            <span class="text-slate-400 text-[10px]">{{ showUserDropdown ? '▲' : '▼' }}</span>
          </div>

          <!-- Dropdown Popover de Usuarios -->
          <div
            v-if="showUserDropdown"
            class="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-slate-200 bg-white p-3 shadow-lg space-y-2"
          >
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <input
                v-model="userSearchTerm"
                type="text"
                placeholder="Buscar usuario..."
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs outline-none focus:bg-white focus:border-brand"
              />
              <button
                v-if="selectedUsuarioIds.length > 0"
                type="button"
                class="text-[10px] font-semibold text-rose-600 hover:underline shrink-0"
                @click="clearUsuarios"
              >
                Limpiar
              </button>
            </div>

            <div class="max-h-40 overflow-y-auto space-y-0.5 pr-1">
              <div
                v-for="u in filteredUsuarios"
                :key="u.id"
                class="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs cursor-pointer transition hover:bg-slate-50"
                :class="isUsuarioSelected(Number(u.id)) ? 'bg-brand/5 font-semibold text-brand' : 'text-slate-700'"
                @click="toggleUsuario(Number(u.id))"
              >
                <span class="truncate">{{ u.nombreCompleto || u.username }}</span>
                <span v-if="isUsuarioSelected(Number(u.id))" class="text-brand font-bold">✓</span>
              </div>
              <p v-if="filteredUsuarios.length === 0" class="text-[11px] text-slate-400 text-center py-2">
                Sin resultados
              </p>
            </div>
          </div>
        </div>

        <!-- Multi-select Vendedores -->
        <div class="relative">
          <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Asesores / Vendedores
          </label>
          <div
            class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs cursor-pointer hover:bg-slate-100/60 transition"
            @click="showVendedorDropdown = !showVendedorDropdown"
          >
            <div class="flex items-center gap-1.5 truncate">
              <span v-if="selectedVendedorIds.length === 0" class="text-slate-500 font-medium">Todos los vendedores</span>
              <span v-else class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                {{ selectedVendedorIds.length }} seleccionado(s)
              </span>
            </div>
            <span class="text-slate-400 text-[10px]">{{ showVendedorDropdown ? '▲' : '▼' }}</span>
          </div>

          <!-- Dropdown Popover de Vendedores -->
          <div
            v-if="showVendedorDropdown"
            class="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-slate-200 bg-white p-3 shadow-lg space-y-2"
          >
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <input
                v-model="vendedorSearchTerm"
                type="text"
                placeholder="Buscar vendedor..."
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs outline-none focus:bg-white focus:border-brand"
              />
              <button
                v-if="selectedVendedorIds.length > 0"
                type="button"
                class="text-[10px] font-semibold text-rose-600 hover:underline shrink-0"
                @click="clearVendedores"
              >
                Limpiar
              </button>
            </div>

            <div class="max-h-40 overflow-y-auto space-y-0.5 pr-1">
              <div
                v-for="v in filteredVendedores"
                :key="v.id"
                class="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs cursor-pointer transition hover:bg-slate-50"
                :class="isVendedorSelected(Number(v.id)) ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-700'"
                @click="toggleVendedor(Number(v.id))"
              >
                <span class="truncate">[{{ v.codigo }}] {{ v.nombre }}</span>
                <span v-if="isVendedorSelected(Number(v.id))" class="text-indigo-700 font-bold">✓</span>
              </div>
              <p v-if="filteredVendedores.length === 0" class="text-[11px] text-slate-400 text-center py-2">
                Sin resultados
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Opciones Avanzadas Desplegables -->
      <div v-if="showOptions" class="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs text-slate-700">
        <label class="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-900">
          <input v-model="optDetallarVentasDia" type="checkbox" class="rounded text-brand focus:ring-0" />
          <span>Detallar Transacciones de Venta</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-900">
          <input v-model="optDetallarOtrasFormasPago" type="checkbox" class="rounded text-brand focus:ring-0" />
          <span>Detallar Formas de Pago (Pesos, Zelle, etc.)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-900">
          <input v-model="optDetallarRecibosCaja" type="checkbox" class="rounded text-brand focus:ring-0" />
          <span>Detallar Cobros CxC Emitidos</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-900">
          <input v-model="optDetallarTarjetas" type="checkbox" class="rounded text-brand focus:ring-0" />
          <span>Detallar Tarjetas de Débito / Crédito</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-900">
          <input v-model="optDetallarDepositos" type="checkbox" class="rounded text-brand focus:ring-0" />
          <span>Detallar Depósitos y Transferencias</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-900">
          <input v-model="optDetallarProductos" type="checkbox" class="rounded text-brand focus:ring-0" />
          <span>Detallar Productos Vendidos</span>
        </label>
      </div>

      <!-- Botones de Acción Minimalistas -->
      <div class="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div class="text-[11px] font-medium text-slate-500">
          Fórmula oficial: <span class="font-bold text-slate-800">Venta Neta = Base Imponible − Descuento</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
            @click="handleExportExcel"
          >
            <svg class="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Excel</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
            @click="handlePrint"
          >
            <svg class="h-3.5 w-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-hover active:scale-98 transition"
            @click="fetchDailyReport"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Generar Reporte</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Spinner de Carga -->
    <div v-if="isLoading" class="flex items-center justify-center rounded-2xl bg-white py-20 shadow-xs border border-slate-200/60 print:hidden">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand"></div>
      <span class="ml-3 text-xs font-medium text-slate-500">Calculando balance diario...</span>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════
         VISTA DEL REPORTE - ESTILO EJECUTIVO MINIMALISTA
         ══════════════════════════════════════════════════════════════════════════ -->
    <div
      v-else
      class="report-sheet bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs print:border-none print:shadow-none print:p-0 font-sans text-slate-900 space-y-6"
    >
      <!-- ── Encabezado Oficial ── -->
      <header class="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Informe Contable de Cierre
          </span>
          <h1 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
            {{ reportData.empresa }}
          </h1>
          <div class="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600 font-medium">
            <span>Fecha: <strong class="text-slate-900">{{ formatShortDate(fechaDesde) }}</strong></span>
            <span class="text-slate-300">•</span>
            <span>Moneda: <strong class="text-slate-900">{{ reportData.moneda }}</strong></span>
            <span v-if="selectedUsuarioIds.length > 0" class="text-brand font-semibold">
              ({{ selectedUsuarioIds.length }} usuarios)
            </span>
            <span v-if="selectedVendedorIds.length > 0" class="text-indigo-700 font-semibold">
              ({{ selectedVendedorIds.length }} vendedores)
            </span>
          </div>
        </div>

        <div class="text-right text-xs text-slate-500 space-y-0.5 font-mono">
          <p>Emisión: <strong class="text-slate-800">{{ formatShortDate(fechaDesde) }}</strong></p>
          <p>Hora: <strong class="text-slate-800">{{ currentFormattedTime }}</strong></p>
        </div>
      </header>

      <!-- ── KPI CARDS (Resumen Ejecutivo) ── -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3.5 print:grid-cols-5">
        <!-- Ventas Brutas -->
        <div class="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
          <span class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ventas Brutas</span>
          <span class="mt-1 block font-mono text-sm sm:text-base font-bold text-slate-900">
            {{ formatMoney(reportData.cierreOperaciones.totalVentasBrutas) }}
          </span>
        </div>

        <!-- Descuentos -->
        <div class="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
          <span class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Descuentos</span>
          <span class="mt-1 block font-mono text-sm sm:text-base font-bold text-rose-600">
            -{{ formatMoney(reportData.cierreOperaciones.totalDescuentos) }}
          </span>
        </div>

        <!-- Venta Neta (Base - Descuento) -->
        <div class="rounded-xl border border-brand/20 bg-brand/5 p-3.5">
          <span class="block text-[10px] font-bold text-brand uppercase tracking-wider">Venta Neta (Base)</span>
          <span class="mt-1 block font-mono text-sm sm:text-base font-black text-brand">
            {{ formatMoney(ventaNetaTotal) }}
          </span>
        </div>

        <!-- Impuestos -->
        <div class="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
          <span class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Impuestos (IVA+IGTF)</span>
          <span class="mt-1 block font-mono text-sm sm:text-base font-bold text-slate-700">
            {{ formatMoney(reportData.cierreOperaciones.totalIva + reportData.cierreOperaciones.totalIgtf) }}
          </span>
        </div>

        <!-- Total Ingresos -->
        <div class="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 col-span-2 lg:col-span-1">
          <span class="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Ingresos</span>
          <span class="mt-1 block font-mono text-sm sm:text-base font-black text-emerald-700">
            {{ formatMoney(reportData.cierreOperaciones.totalIngresos) }}
          </span>
        </div>
      </div>

      <!-- ── SECCIÓN 1: CIERRE DE OPERACIONES & CUENTAS POR COBRAR ── -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Cierre de Facturación -->
        <div class="rounded-xl border border-slate-200/80 p-4 space-y-2.5">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            Cierre de Operaciones de Facturas
          </h3>
          <div class="space-y-1.5 text-xs">
            <div class="flex justify-between py-1 text-slate-600">
              <span>Total Ventas Brutas</span>
              <span class="font-mono font-semibold text-slate-900">{{ formatMoney(reportData.cierreOperaciones.totalVentasBrutas) }}</span>
            </div>
            <div class="flex justify-between py-1 text-slate-600">
              <span>Total Descuentos</span>
              <span class="font-mono font-semibold text-rose-600">-{{ formatMoney(reportData.cierreOperaciones.totalDescuentos) }}</span>
            </div>
            <div class="flex justify-between py-1 text-slate-600">
              <span>Total I.V.A. (%)</span>
              <span class="font-mono font-semibold text-slate-900">{{ formatMoney(reportData.cierreOperaciones.totalIva) }}</span>
            </div>
            <div class="flex justify-between py-1 text-slate-600">
              <span>Total IGTF (3%)</span>
              <span class="font-mono font-semibold text-slate-900">{{ formatMoney(reportData.cierreOperaciones.totalIgtf) }}</span>
            </div>
            <div class="flex justify-between py-1 bg-slate-50 px-2 rounded font-semibold text-slate-800">
              <span>Total Contado</span>
              <span class="font-mono">{{ formatMoney(reportData.cierreOperaciones.totalContado) }}</span>
            </div>
            <div class="flex justify-between py-1 text-slate-600 px-2">
              <span>Total Crédito en Operaciones</span>
              <span class="font-mono font-semibold text-slate-900">{{ formatMoney(reportData.cierreOperaciones.totalCredito) }}</span>
            </div>
            <div class="flex justify-between py-1 text-slate-600">
              <span>Total Transacciones</span>
              <span class="font-mono font-semibold text-slate-900">{{ formatMoney(reportData.cierreOperaciones.totalTransacciones) }}</span>
            </div>
            <div class="flex justify-between py-1 text-slate-600">
              <span>Total Gravable / Exento</span>
              <span class="font-mono font-semibold text-slate-900">
                {{ formatMoney(reportData.cierreOperaciones.totalGravable) }} / {{ formatMoney(reportData.cierreOperaciones.totalExento) }}
              </span>
            </div>
            <div class="flex justify-between py-2 border-t border-slate-200 mt-2 font-bold text-slate-900">
              <span>Total Efectivo en Caja</span>
              <span class="font-mono text-emerald-700">{{ formatMoney(reportData.cierreOperaciones.totalEfectivo) }}</span>
            </div>
          </div>
        </div>

        <!-- Operaciones CxC -->
        <div v-if="optDetallarRecibosCaja" class="rounded-xl border border-slate-200/80 p-4 space-y-2.5">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            Operaciones en Cuentas por Cobrar (CxC)
          </h3>
          <div class="space-y-1.5 text-xs">
            <div class="flex justify-between py-1 text-slate-600">
              <span>Número de Facturas</span>
              <span class="font-mono font-semibold text-slate-900">{{ formatMoney(reportData.operacionesCxC.numeroFacturas) }}</span>
            </div>
            <div class="flex justify-between py-1 text-slate-600">
              <span>Número de Pagos Recibidos</span>
              <span class="font-mono font-semibold text-slate-900">{{ formatMoney(reportData.operacionesCxC.numeroPagosRecibidos) }}</span>
            </div>
            <div class="flex justify-between py-1 text-slate-600">
              <span>Monto en Pagos Recibidos</span>
              <span class="font-mono font-semibold text-slate-900">{{ formatMoney(reportData.operacionesCxC.montoPagosRecibidos) }}</span>
            </div>
            <div class="flex justify-between py-1 text-slate-600">
              <span>Total Efectivo CxC</span>
              <span class="font-mono font-semibold text-slate-900">{{ formatMoney(reportData.operacionesCxC.totalEfectivo) }}</span>
            </div>
            <div class="flex justify-between py-1 text-slate-600">
              <span>Total Otras Formas de Pago</span>
              <span class="font-mono font-semibold text-slate-900">{{ formatMoney(reportData.operacionesCxC.totalOtrasFormasPago) }}</span>
            </div>
            <div class="flex justify-between py-2 bg-blue-50/60 px-3 rounded-lg border border-blue-100 font-bold text-blue-900 mt-6">
              <span>Total Ingresos CxC</span>
              <span class="font-mono">{{ formatMoney(reportData.operacionesCxC.totalIngresos) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── SECCIÓN 2: OTRAS FORMAS DE PAGO (Pesos, Dólares, Zelle, etc.) ── -->
      <section v-if="optDetallarOtrasFormasPago" class="space-y-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
          Otras Formas de Pago — Detalle
        </h3>

        <div class="overflow-x-auto rounded-xl border border-slate-200/80">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th class="py-2.5 px-3">Forma de Pago / Divisa</th>
                <th class="py-2.5 px-3 text-right">Monto Local</th>
                <th class="py-2.5 px-3 text-right">Monto en Divisas</th>
                <th class="py-2.5 px-3 text-right">IGTF (3%)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="row in reportData.otrasFormasPagoDetalle"
                :key="row.descripcion"
                class="hover:bg-slate-50/50 transition"
              >
                <td class="py-2.5 px-3 font-medium text-slate-800">
                  {{ row.descripcion }}
                </td>
                <td class="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                  {{ formatMoney(row.monto) }}
                </td>
                <td class="py-2.5 px-3 text-right font-mono text-slate-700">
                  {{ formatMoney(row.montoDivisas) }}
                </td>
                <td class="py-2.5 px-3 text-right font-mono text-slate-500">
                  {{ formatMoney(row.igtf) }}
                </td>
              </tr>
              <tr v-if="reportData.otrasFormasPagoDetalle.length === 0">
                <td colspan="4" class="py-4 text-center text-slate-400 italic">
                  No hay transacciones registradas para este periodo.
                </td>
              </tr>
            </tbody>
            <tfoot v-if="reportData.otrasFormasPagoDetalle.length > 0">
              <tr class="bg-slate-50/90 font-mono font-bold text-slate-900 border-t border-slate-200">
                <td class="py-2.5 px-3 font-sans uppercase text-[11px] text-slate-500">
                  Total
                </td>
                <td class="py-2.5 px-3 text-right">
                  {{ formatMoney(otrasFormasTotales.monto) }}
                </td>
                <td class="py-2.5 px-3 text-right">
                  {{ formatMoney(otrasFormasTotales.montoDivisas) }}
                </td>
                <td class="py-2.5 px-3 text-right">
                  {{ formatMoney(otrasFormasTotales.igtf) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- ── SECCIÓN 3: TRANSACCIONES DEL DÍA ── -->
      <section v-if="optDetallarVentasDia" class="space-y-3">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
              Transacciones del Día
            </h3>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 font-mono">
              {{ filteredTransacciones.length }}
            </span>
          </div>

          <!-- Buscador instantáneo dentro de la tabla -->
          <div class="relative w-full sm:w-64 print:hidden">
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Buscar documento o cliente..."
              class="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-xs outline-none transition focus:border-brand focus:bg-white"
            />
          </div>
        </div>

        <div class="overflow-x-auto rounded-xl border border-slate-200/80">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th class="py-2.5 px-3 whitespace-nowrap">Documento</th>
                <th class="py-2.5 px-3">Cliente / Descripción</th>
                <th class="py-2.5 px-3 text-right whitespace-nowrap">Monto Neto</th>
                <th class="py-2.5 px-3 text-right whitespace-nowrap">Impuestos</th>
                <th class="py-2.5 px-3 text-right whitespace-nowrap">Contado</th>
                <th class="py-2.5 px-3 text-right whitespace-nowrap">Crédito</th>
                <th class="py-2.5 px-3 text-center whitespace-nowrap">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono">
              <tr
                v-for="t in filteredTransacciones"
                :key="t.id"
                class="hover:bg-slate-50/50 transition"
                :class="t.status === 'ANULADA' ? 'opacity-50 italic bg-slate-50/30' : ''"
              >
                <td class="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                  {{ t.documento }}
                </td>
                <td class="py-2 px-3 font-sans text-slate-700 truncate max-w-xs" :title="t.descripcion">
                  {{ t.descripcion }}
                </td>
                <td class="py-2 px-3 text-right font-semibold text-slate-900">
                  {{ formatMoney(t.montoNeto) }}
                </td>
                <td class="py-2 px-3 text-right text-slate-600">
                  {{ formatMoney(t.impuestos) }}
                </td>
                <td class="py-2 px-3 text-right font-semibold" :class="t.contado > 0 ? 'text-emerald-700' : 'text-slate-400'">
                  {{ formatMoney(t.contado) }}
                </td>
                <td class="py-2 px-3 text-right font-semibold" :class="t.credito > 0 ? 'text-amber-700' : 'text-slate-400'">
                  {{ formatMoney(t.credito) }}
                </td>
                <td class="py-2 px-3 text-center font-sans">
                  <span
                    v-if="t.status === 'ANULADA'"
                    class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                  >
                    ANULADA
                  </span>
                  <span
                    v-else-if="t.credito > 0"
                    class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700"
                  >
                    Crédito
                  </span>
                  <span
                    v-else
                    class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700"
                  >
                    Contado
                  </span>
                </td>
              </tr>
              <tr v-if="filteredTransacciones.length === 0">
                <td colspan="7" class="py-8 text-center text-slate-400 font-sans italic">
                  No hay transacciones que coincidan con la búsqueda.
                </td>
              </tr>
            </tbody>
            <tfoot v-if="filteredTransacciones.length > 0">
              <tr class="bg-slate-50/90 font-mono font-bold text-slate-900 border-t border-slate-200">
                <td colspan="2" class="py-2.5 px-3 font-sans uppercase text-[11px] text-slate-500 text-right">
                  Totales:
                </td>
                <td class="py-2.5 px-3 text-right">
                  {{ formatMoney(transaccionesTotales.montoNeto) }}
                </td>
                <td class="py-2.5 px-3 text-right text-slate-600">
                  {{ formatMoney(transaccionesTotales.impuestos) }}
                </td>
                <td class="py-2.5 px-3 text-right text-emerald-700">
                  {{ formatMoney(transaccionesTotales.contado) }}
                </td>
                <td class="py-2.5 px-3 text-right text-amber-700">
                  {{ formatMoney(transaccionesTotales.credito) }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    margin: 8mm 12mm;
    size: portrait;
  }
  body {
    background: white !important;
    color: black !important;
    font-size: 10pt !important;
  }
  .report-sheet {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    width: 100% !important;
  }
  table {
    page-break-inside: auto;
  }
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  thead {
    display: table-header-group;
  }
  tfoot {
    display: table-footer-group;
  }
}
</style>
