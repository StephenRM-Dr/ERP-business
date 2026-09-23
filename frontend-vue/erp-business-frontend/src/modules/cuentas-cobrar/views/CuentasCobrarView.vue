<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useCustomerStore } from '@/modules/customers/interfaces/customer.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useCuentasCobrarStore } from '../interfaces/cuentas-cobrar.store';
import { useRecibosCobroStore } from '@/modules/recibos-cobro/recibos-cobro.store';
import { useCompanyInfo } from '@/composables/useCompanyInfo';
import ReciboCobroPrintPreview from '@/modules/recibos-cobro/components/ReciboCobroPrintPreview.vue';
import DocumentoCxCPrintPreview from '../components/DocumentoCxCPrintPreview.vue';
import type { MovimientoCxC } from '../interfaces/cuenta-cobrar.interface';
import { exportToCsv } from '@/utils/csv-export';

// ─── Stores & Composables ──────────────────────────────────────────────────────
const customerStore = useCustomerStore();
const currenciesStore = useCurrenciesStore();
const cxcStore = useCuentasCobrarStore();
const recibosStore = useRecibosCobroStore();
const { ensureLoaded: ensureCompanyLoaded, companyFor } = useCompanyInfo();

onMounted(() => {
  ensureCompanyLoaded();
  if (customerStore.customerList.length === 0) customerStore.fetchCustomers();
  if (currenciesStore.currencies.length === 0) currenciesStore.fetchCurrencies();
});

// ─── State ─────────────────────────────────────────────────────────────────────
const selectedClientId = ref<string>('');
const clientSearchTerm = ref<string>('');
const isClientDropdownOpen = ref<boolean>(false);
const activeFilterStatus = ref<'ALL' | 'PENDIENTE' | 'PAGADO'>('ALL');
const activeCurrencyCode = ref<string>('USD');
const isOpcionesMenuOpen = ref<boolean>(false);
const isVerMenuOpen = ref<boolean>(false);

// ─── Modals State ──────────────────────────────────────────────────────────────
const showModalPago = ref<boolean>(false);
const showModalNotaCredito = ref<boolean>(false);
const showModalNotaDebito = ref<boolean>(false);
const showModalAdelanto = ref<boolean>(false);
const showModalGiro = ref<boolean>(false);
const showModalAplicarPendientes = ref<boolean>(false);
const showConfirmAnular = ref<boolean>(false);
const showModalAnularDoc = ref<boolean>(false);
const docToAnular = ref<{ id: number; tipo: string; numero: string; monto: number } | null>(null);

// ─── Pagos o Abonos Modal Interface & State ─────────────────────────────────────
interface PagoDocRow {
  cxcId: number;
  selected: boolean;
  emision: string;
  vencimiento: string;
  tipo: string;
  numero: string;
  moneda: string;
  montoOriginal: number;
  saldo: number;
  descuento: number;
  saldoTotal: number;
  retencion: number;
  montoPago: number;
}

const pagoDocumentos = ref<PagoDocRow[]>([]);
const pagoForm = reactive({
  fechaOperacion: new Date().toISOString().slice(0, 10),
  monedaId: 1,
  monedaNombre: '$ Dólares',
  monto_total: 0,
  factorCambio: 804.8109,
  forma_pago: 'TRANSFERENCIA',
  documentoNo: '00007483',
  observaciones: '',
});

const ncForm = reactive({
  monto: 0,
  moneda_id: 1,
  factura_id: undefined as number | undefined,
  cxc_id: undefined as number | undefined,
  numero_documento: '',
  motivo: '',
  observaciones: '',
});

const ndForm = reactive({
  monto: 0,
  moneda_id: 1,
  numero_documento: '',
  motivo: '',
  observaciones: '',
});

const adelantoForm = reactive({
  monto: 0,
  moneda_id: 1,
  numero_documento: '',
  motivo: '',
  observaciones: '',
});

const giroForm = reactive({
  monto: 0,
  moneda_id: 1,
  numero_documento: '',
  fecha_vencimiento: '',
  observaciones: '',
});

const showModalFactura = ref(false);
const facturaForm = reactive({
  monto: 0,
  moneda_id: 1,
  sucursal_id: 1,
  numero_documento: '',
  fecha_vencimiento: '',
  motivo: '',
  observaciones: '',
});

const filtroSucursal = ref<string>('ALL');

const sucursalesList = [
  { id: 0, sigla: 'NAC', nombre: '🇻🇪 Operaciones Nacionales (NAC)' },
  { id: 1, sigla: 'CCS', nombre: 'Caracas (CCS)' },
  { id: 2, sigla: 'SC', nombre: 'San Cristóbal (SC)' },
  { id: 3, sigla: 'MRD', nombre: 'Mérida (MRD)' },
  { id: 4, sigla: 'CCD', nombre: 'Concordia (CCD)' },
  { id: 5, sigla: 'BNS', nombre: 'Barinas (BNS)' },
  { id: 6, sigla: 'VLC', nombre: 'Valencia (VLC)' },
  { id: 7, sigla: 'MCBO', nombre: 'Maracaibo (MCBO)' },
];

const aplicarForm = reactive({
  credito_cxc_id: null as number | null,
  aplicaciones: [] as { debito_cxc_id: number; monto: number }[],
});

// ─── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (customerStore.customerList.length === 0) {
    await customerStore.fetchCustomers();
  }
  if (currenciesStore.currencies.length === 0) {
    await currenciesStore.fetchCurrencies();
  }
});

// ─── Client Selection ──────────────────────────────────────────────────────────
const filteredCustomers = computed(() => {
  const term = clientSearchTerm.value.trim().toLowerCase();
  if (!term) return customerStore.customerList.slice(0, 20);
  return customerStore.customerList
    .filter(
      (c) =>
        c.firstName.toLowerCase().includes(term) ||
        c.lastName.toLowerCase().includes(term) ||
        (c.documentNumber || '').toLowerCase().includes(term) ||
        String(c.id).includes(term),
    )
    .slice(0, 20);
});

const selectedClient = computed(() => {
  if (!selectedClientId.value) return null;
  return customerStore.getCustomerById(selectedClientId.value);
});

async function onSelectCustomer(id: string): Promise<void> {
  selectedClientId.value = id;
  isClientDropdownOpen.value = false;
  clientSearchTerm.value = '';
  await cxcStore.fetchResumenCliente(Number(id));
}

// ─── Filtered Movements ────────────────────────────────────────────────────────
const filteredMovimientos = computed<MovimientoCxC[]>(() => {
  if (!cxcStore.resumen) return [];
  return cxcStore.resumen.movimientos.filter((m) => {
    // Filtro por Estado
    if (activeFilterStatus.value === 'PENDIENTE' && !(m.status === 'PENDIENTE' && m.saldoPendiente > 0)) return false;
    if (activeFilterStatus.value === 'PAGADO' && !(m.status === 'PAGADO' || m.saldoPendiente === 0)) return false;

    // Filtro por Tienda / Sucursal
    if (filtroSucursal.value !== 'ALL') {
      const matchId = String(m.sucursalId) === filtroSucursal.value;
      const matchSigla = m.sucursalSigla?.toUpperCase() === filtroSucursal.value.toUpperCase();
      if (!matchId && !matchSigla) return false;
    }

    return true;
  });
});

// Pending invoices / debits list for payments and NC
const pendingDebits = computed(() => {
  if (!cxcStore.resumen) return [];
  return cxcStore.resumen.movimientos.filter(
    (m) => ['FACTURA', 'NOTA_DEBITO', 'GIRO', 'AJUSTE'].includes(m.tipo) && m.saldoPendiente > 0,
  );
});

// Pending credits (anticipos / NCs) for crossing
const pendingCredits = computed(() => {
  if (!cxcStore.resumen) return [];
  return cxcStore.resumen.movimientos.filter(
    (m) => ['ADELANTO', 'NOTA_CREDITO'].includes(m.tipo) && m.saldoPendiente > 0,
  );
});

// Calculate running balance
const movementsWithRunningBalance = computed(() => {
  let running = 0;
  return filteredMovimientos.value.map((m) => {
    if (['FACTURA', 'NOTA_DEBITO', 'GIRO', 'AJUSTE'].includes(m.tipo)) {
      running += m.debito;
    } else {
      running -= m.credito;
    }
    return {
      ...m,
      saldoAcumulado: running,
    };
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string | Date | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatMoney(amount: number): string {
  return (amount || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getBadgeColor(tipo: string): string {
  switch (tipo) {
    case 'FACTURA': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PAGO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'NOTA_CREDITO': return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'NOTA_DEBITO': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'ADELANTO': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'GIRO': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function handlePrint(): void {
  window.print();
}

function exportExcel(): void {
  if (!cxcStore.resumen) return;
  const headers = ['Fecha', 'Tipo', 'Documento #', 'Origen', 'Descripción', 'Débito (+)', 'Crédito (-)', 'Saldo Pendiente', 'Estado'];
  const rows = movementsWithRunningBalance.value.map((m) => [
    formatDate(m.fecha),
    m.tipoLabel,
    m.documentoNumero,
    m.documentoOrigen || '',
    m.descripcion,
    m.debito > 0 ? m.debito.toFixed(2) : '0.00',
    m.credito > 0 ? m.credito.toFixed(2) : '0.00',
    m.saldoPendiente.toFixed(2),
    m.status,
  ]);
  const clientName = cxcStore.resumen.cliente.nombre.replace(/\s+/g, '_');
  exportToCsv(`Estado_Cuenta_CxC_${clientName}_${new Date().toISOString().slice(0, 10)}`, headers, rows);
}

// ─── Action Handlers: Pagos o Abonos ──────────────────────────────────────────
const totalSaldoDocumentos = computed(() => {
  return pagoDocumentos.value.reduce((sum, r) => sum + r.saldo, 0);
});

const totalDescuentosPago = computed(() => {
  return pagoDocumentos.value.reduce((sum, r) => sum + (r.selected ? r.descuento : 0), 0);
});

const totalRetencionesPago = computed(() => {
  return pagoDocumentos.value.reduce((sum, r) => sum + (r.selected ? r.retencion : 0), 0);
});

function openModalPago(cxcItem?: MovimientoCxC): void {
  pagoForm.fechaOperacion = new Date().toISOString().slice(0, 10);
  pagoForm.monedaId = 1;
  pagoForm.monedaNombre = '$ Dólares';
  pagoForm.factorCambio = 804.8109;
  pagoForm.forma_pago = 'TRANSFERENCIA';
  pagoForm.observaciones = '';
  pagoForm.documentoNo = `0000${Math.floor(1000 + Math.random() * 9000)}`;

  // Poblar documentos pendientes desde pendingDebits
  pagoDocumentos.value = pendingDebits.value.map((d) => {
    const rawId = typeof d.id === 'string' ? Number(d.id.replace('cxc-', '')) : Number(d.id);
    const isTarget = cxcItem
      ? rawId === (typeof cxcItem.id === 'string' ? Number(cxcItem.id.replace('cxc-', '')) : Number(cxcItem.id))
      : false;
    return {
      cxcId: rawId,
      selected: isTarget,
      emision: d.fecha ? String(d.fecha).slice(0, 10) : '',
      vencimiento: d.fechaVencimiento ? String(d.fechaVencimiento).slice(0, 10) : (d.fecha ? String(d.fecha).slice(0, 10) : ''),
      tipo: d.tipo === 'FACTURA' ? 'FACT' : (d.tipo === 'NOTA_DEBITO' ? 'N/D' : d.tipo),
      numero: d.documentoNumero,
      moneda: 'Dólares',
      montoOriginal: d.debito,
      saldo: d.saldoPendiente,
      descuento: 0,
      saldoTotal: d.saldoPendiente,
      retencion: 0,
      montoPago: isTarget ? d.saldoPendiente : 0,
    };
  });

  recalculatePagoTotals();
  showModalPago.value = true;
  isOpcionesMenuOpen.value = false;
}

function onTogglePagoRow(row: PagoDocRow): void {
  if (row.selected) {
    row.montoPago = Math.max(0, row.saldo - row.descuento - row.retencion);
  } else {
    row.montoPago = 0;
  }
  recalculatePagoTotals();
}

function onRowMontoPagoChange(row: PagoDocRow): void {
  if (row.montoPago > 0) {
    row.selected = true;
  } else {
    row.selected = false;
  }
  recalculatePagoTotals();
}

function onMontoPagoTopInput(): void {
  let remaining = pagoForm.monto_total;
  for (const row of pagoDocumentos.value) {
    if (remaining <= 0) {
      row.selected = false;
      row.montoPago = 0;
    } else {
      const maxPayable = Math.max(0, row.saldo - row.descuento - row.retencion);
      const toApply = Math.min(remaining, maxPayable);
      row.selected = true;
      row.montoPago = Number(toApply.toFixed(2));
      remaining -= toApply;
    }
  }
}

function recalculatePagoTotals(): void {
  pagoForm.monto_total = Number(
    pagoDocumentos.value.reduce((sum, r) => sum + (r.selected ? r.montoPago : 0), 0).toFixed(2),
  );
}

async function submitPago(): Promise<void> {
  const selectedDocs = pagoDocumentos.value.filter((r) => r.selected && r.montoPago > 0);
  if (!selectedClientId.value || selectedDocs.length === 0) {
    alert('Seleccione al menos un documento para pagar con monto mayor a 0.');
    return;
  }
  const total = Number(selectedDocs.reduce((sum, r) => sum + r.montoPago, 0).toFixed(2));
  const success = await cxcStore.registrarPagoDirecto({
    cliente_id: Number(selectedClientId.value),
    forma_pago: pagoForm.forma_pago,
    monto_total: total,
    moneda_pago_id: pagoForm.monedaId,
    tasa_cambio: pagoForm.factorCambio,
    observaciones: pagoForm.observaciones,
    detalles: selectedDocs.map((r) => ({
      cxc_id: r.cxcId,
      monto_aplicado: r.montoPago,
    })),
  });
  if (success) {
    showModalPago.value = false;
  }
}

function openModalNotaCredito(): void {
  ncForm.monto = 0;
  ncForm.cxc_id = undefined;
  ncForm.numero_documento = '';
  ncForm.motivo = '';
  ncForm.observaciones = '';
  showModalNotaCredito.value = true;
  isOpcionesMenuOpen.value = false;
}

async function submitNotaCredito(): Promise<void> {
  if (!selectedClientId.value || ncForm.monto <= 0) return;
  const success = await cxcStore.createDocumento({
    cliente_id: Number(selectedClientId.value),
    tipo_documento: 'NOTA_CREDITO',
    monto: ncForm.monto,
    moneda_id: ncForm.moneda_id,
    cxc_id: ncForm.cxc_id,
    numero_documento: ncForm.numero_documento || undefined,
    motivo: ncForm.motivo,
    observaciones: ncForm.observaciones,
  });
  if (success) {
    showModalNotaCredito.value = false;
  }
}

function openModalNotaDebito(): void {
  ndForm.monto = 0;
  ndForm.numero_documento = '';
  ndForm.motivo = '';
  ndForm.observaciones = '';
  showModalNotaDebito.value = true;
  isOpcionesMenuOpen.value = false;
}

async function submitNotaDebito(): Promise<void> {
  if (!selectedClientId.value || ndForm.monto <= 0) return;
  const success = await cxcStore.createDocumento({
    cliente_id: Number(selectedClientId.value),
    tipo_documento: 'NOTA_DEBITO',
    monto: ndForm.monto,
    moneda_id: ndForm.moneda_id,
    numero_documento: ndForm.numero_documento || undefined,
    motivo: ndForm.motivo,
    observaciones: ndForm.observaciones,
  });
  if (success) {
    showModalNotaDebito.value = false;
  }
}

function openModalAdelanto(): void {
  adelantoForm.monto = 0;
  adelantoForm.numero_documento = '';
  adelantoForm.motivo = 'Anticipo de cliente';
  adelantoForm.observaciones = '';
  showModalAdelanto.value = true;
  isOpcionesMenuOpen.value = false;
}

async function submitAdelanto(): Promise<void> {
  if (!selectedClientId.value || adelantoForm.monto <= 0) return;
  const success = await cxcStore.createDocumento({
    cliente_id: Number(selectedClientId.value),
    tipo_documento: 'ADELANTO',
    monto: adelantoForm.monto,
    moneda_id: adelantoForm.moneda_id,
    numero_documento: adelantoForm.numero_documento || undefined,
    motivo: adelantoForm.motivo,
    observaciones: adelantoForm.observaciones,
  });
  if (success) {
    showModalAdelanto.value = false;
  }
}

function openModalGiro(): void {
  giroForm.monto = 0;
  giroForm.numero_documento = '';
  giroForm.fecha_vencimiento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  giroForm.observaciones = '';
  showModalGiro.value = true;
  isOpcionesMenuOpen.value = false;
}

async function submitGiro(): Promise<void> {
  if (!selectedClientId.value || giroForm.monto <= 0) return;
  const success = await cxcStore.createDocumento({
    cliente_id: Number(selectedClientId.value),
    tipo_documento: 'GIRO',
    monto: giroForm.monto,
    moneda_id: giroForm.moneda_id,
    numero_documento: giroForm.numero_documento || undefined,
    fecha_vencimiento: giroForm.fecha_vencimiento,
    observaciones: giroForm.observaciones,
  });
  if (success) {
    showModalGiro.value = false;
  }
}

function openModalFactura(): void {
  if (!selectedClientId.value) {
    alert('Seleccione un cliente primero');
    return;
  }
  facturaForm.monto = 0;
  facturaForm.moneda_id = 1;
  facturaForm.sucursal_id = 1;
  facturaForm.numero_documento = '';
  facturaForm.fecha_vencimiento = new Date().toISOString().slice(0, 10);
  facturaForm.motivo = 'Factura Financiera / Servicio (Sin afectar inventario)';
  facturaForm.observaciones = '';
  showModalFactura.value = true;
  isOpcionesMenuOpen.value = false;
}

async function submitFactura(): Promise<void> {
  if (!selectedClientId.value) return;
  if (facturaForm.monto <= 0) {
    alert('Ingrese un monto válido mayor a 0');
    return;
  }
  const success = await cxcStore.createDocumento({
    cliente_id: Number(selectedClientId.value),
    tipo_documento: 'FACTURA_FINANCIERA',
    monto: facturaForm.monto,
    moneda_id: facturaForm.moneda_id,
    sucursal_id: facturaForm.sucursal_id,
    numero_documento: facturaForm.numero_documento.trim() || undefined,
    fecha_vencimiento: facturaForm.fecha_vencimiento || undefined,
    motivo: facturaForm.motivo || 'Factura Financiera (Sin inventario)',
    observaciones: facturaForm.observaciones,
  });
  if (success) {
    showModalFactura.value = false;
  }
}

function openModalAplicarPendientes(): void {
  if (pendingCredits.value.length === 0 || !pendingCredits.value[0]) {
    alert('El cliente no tiene anticipos o notas de crédito con saldo a favor para aplicar.');
    return;
  }
  const firstCredit = pendingCredits.value[0];
  const rawCredId = typeof firstCredit.id === 'string' ? Number(firstCredit.id.replace('cxc-', '')) : firstCredit.id;
  aplicarForm.credito_cxc_id = rawCredId;
  aplicarForm.aplicaciones = pendingDebits.value.map((d) => {
    const rawDebId = typeof d.id === 'string' ? Number(d.id.replace('cxc-', '')) : d.id;
    return {
      debito_cxc_id: rawDebId,
      monto: 0,
    };
  });
  showModalAplicarPendientes.value = true;
  isOpcionesMenuOpen.value = false;
}

async function submitAplicarPendientes(): Promise<void> {
  if (!selectedClientId.value || !aplicarForm.credito_cxc_id) return;
  const aplicacionesValidas = aplicarForm.aplicaciones.filter((a) => a.monto > 0);
  if (aplicacionesValidas.length === 0) {
    alert('Ingrese el monto a aplicar en al menos un documento.');
    return;
  }
  const success = await cxcStore.aplicarDocumentos({
    cliente_id: Number(selectedClientId.value),
    credito_cxc_id: aplicarForm.credito_cxc_id,
    aplicaciones: aplicacionesValidas,
  });
  if (success) {
    showModalAplicarPendientes.value = false;
  }
}

async function onCruzarDevolucionesAuto(): Promise<void> {
  if (!selectedClientId.value) return;
  await cxcStore.cruzarDevolucionesAutomatico(Number(selectedClientId.value));
  isOpcionesMenuOpen.value = false;
}

function requestAnularDoc(row: MovimientoCxC): void {
  const rawId = typeof row.id === 'string' ? Number(row.id.replace(/^(cxc|recibo)-/, '')) : Number(row.id);
  docToAnular.value = {
    id: rawId,
    tipo: row.tipo,
    numero: row.documentoNumero,
    monto: row.debito > 0 ? row.debito : row.credito,
  };
  showModalAnularDoc.value = true;
}

async function confirmAnularDoc(): Promise<void> {
  if (!docToAnular.value) return;
  const success = await cxcStore.anularDocumentoEspecifico(docToAnular.value.tipo, docToAnular.value.id);
  if (success) {
    showModalAnularDoc.value = false;
    docToAnular.value = null;
  }
}

async function executeAnularUltima(): Promise<void> {
  if (!selectedClientId.value) return;
  const success = await cxcStore.anularUltimaOperacion(Number(selectedClientId.value));
  showConfirmAnular.value = false;
}

// ─── Reimpresión de Recibos y Documentos CxC ──────────────────────────────────
const showPrintReciboModal = ref<boolean>(false);
const printReciboData = ref<any | null>(null);

const showPrintDocModal = ref<boolean>(false);
const printDocData = ref<any | null>(null);

const isPrintingMovement = ref<boolean>(false);

async function openPrintMovement(row: MovimientoCxC): Promise<void> {
  const isRecibo = row.tipo === 'RECIBO_COBRO' || row.tipo === 'PAGO' || String(row.id).startsWith('recibo-');
  const rawId = typeof row.id === 'string' ? Number(row.id.replace(/^(cxc|recibo)-/, '')) : Number(row.id);

  if (isRecibo) {
    isPrintingMovement.value = true;
    try {
      const recibo = await recibosStore.fetchReciboById(rawId);
      printReciboData.value = recibo;
      showPrintReciboModal.value = true;
    } catch (e) {
      // Fallback a partir de los datos disponibles en la fila
      printReciboData.value = {
        id: String(rawId),
        clienteId: Number(selectedClientId.value),
        sucursalId: row.sucursalId || 1,
        numeroRecibo: row.documentoNumero,
        fechaPago: row.fecha,
        formaPago: row.tipo === 'PAGO' ? 'PAGO DIRECTO' : 'ANTICIPO',
        montoTotal: row.credito > 0 ? row.credito : row.debito,
        monedaPagoId: row.monedaId || 1,
        tasaCambio: row.tasaCambio || 1,
        aplicaIgtf: false,
        igtfPorcentaje: 0,
        igtfMonto: 0,
        cuentaBancariaId: null,
        observaciones: row.descripcion,
        detalles: [],
      };
      showPrintReciboModal.value = true;
    } finally {
      isPrintingMovement.value = false;
    }
  } else {
    // Documento CxC (Nota de Crédito, Nota de Débito, Adelanto, Giro, Factura, Ajuste)
    printDocData.value = {
      id: rawId,
      tipo: row.tipo,
      tipoLabel: row.tipoLabel,
      documentoNumero: row.documentoNumero,
      documentoOrigen: row.documentoOrigen,
      fecha: formatDate(row.fecha),
      fechaVencimiento: row.fechaVencimiento ? formatDate(row.fechaVencimiento) : null,
      descripcion: row.descripcion,
      monedaId: row.monedaId || 1,
      tasaCambio: row.tasaCambio || 1,
      monto: row.debito > 0 ? row.debito : row.credito,
      saldoPendiente: row.saldoPendiente,
      status: row.status,
      sucursalNombre: row.sucursalNombre,
      sucursalSigla: row.sucursalSigla,
    };
    showPrintDocModal.value = true;
  }
}
</script>

<template>
  <div class="mx-auto max-w-[1450px] p-4 font-sans text-gray-800">

    <!-- ══ CABECERA PRINCIPAL: Título y Datos del Cliente ═══════════════════════ -->
    <div class="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div class="grid grid-cols-12 gap-4">

        <!-- Columna Izquierda: Búsqueda y Datos del Cliente -->
        <div class="col-span-12 lg:col-span-7">
          <div class="mb-3 flex items-center gap-2">
            <span class="text-xl">💳</span>
            <h1 class="text-lg font-black text-gray-900">Cuentas x Cobrar</h1>
          </div>

          <div class="space-y-2.5 text-xs">
            <!-- Selector de Código / Cliente -->
            <div class="flex items-center gap-2">
              <label class="w-20 font-bold text-gray-700">Código:</label>
              <div class="relative flex-1">
                <input
                  v-model="clientSearchTerm"
                  type="text"
                  placeholder="🔍 Buscar por Cédula, RIF o Nombre de cliente..."
                  class="w-full rounded-lg border border-gray-300 px-3 py-1.5 font-mono text-xs font-semibold outline-none focus:border-brand"
                  @focus="isClientDropdownOpen = true"
                />

                <!-- Dropdown de clientes -->
                <div
                  v-if="isClientDropdownOpen"
                  class="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl"
                >
                  <div
                    v-for="c in filteredCustomers"
                    :key="c.id"
                    class="cursor-pointer px-3 py-2 text-xs transition hover:bg-brand/10"
                    @click="onSelectCustomer(c.id)"
                  >
                    <span class="font-mono font-bold text-brand">[{{ c.documentNumber || c.id }}]</span>
                    <span class="ml-2 font-medium text-gray-900">{{ c.firstName }} {{ c.lastName }}</span>
                  </div>
                  <div v-if="filteredCustomers.length === 0" class="p-3 text-center text-gray-400">
                    No se encontraron clientes.
                  </div>
                </div>
              </div>
            </div>

            <!-- Nombre de Cliente -->
            <div class="flex items-center gap-2">
              <label class="w-20 font-bold text-gray-700">Cliente:</label>
              <input
                type="text"
                readonly
                :value="cxcStore.resumen?.cliente.nombre || (selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'Seleccione un cliente...')"
                class="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 font-bold text-gray-900 outline-none"
              />
            </div>

            <!-- Dirección -->
            <div class="flex items-start gap-2">
              <label class="w-20 font-bold text-gray-700">Dirección:</label>
              <textarea
                readonly
                rows="2"
                :value="cxcStore.resumen?.cliente.direccion || (selectedClient ? (selectedClient.notes || '—') : '—')"
                class="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700 outline-none"
              />
            </div>
          </div>
        </div>

        <!-- Columna Derecha: Tarjeta Resumen de Saldos (Réplica de la Imagen de Referencia) -->
        <div class="col-span-12 lg:col-span-5 flex flex-col justify-between">
          <div class="rounded-xl border border-gray-300 bg-white p-3 shadow-inner">
            <div class="grid grid-cols-2 gap-y-1.5 text-xs">
              <span class="text-gray-600 font-medium">Anticipos:</span>
              <span class="text-right font-mono font-semibold text-purple-700">
                {{ formatMoney(cxcStore.resumen?.totales.adelantos || 0) }}
              </span>

              <span class="text-gray-600 font-medium">Devoluciones Pendientes:</span>
              <span class="text-right font-mono font-semibold text-teal-700">
                {{ formatMoney(cxcStore.resumen?.totales.devolucionesPendientes || 0) }}
              </span>

              <span class="text-gray-600 font-medium">Débitos:</span>
              <span class="text-right font-mono font-semibold text-blue-800">
                {{ formatMoney(cxcStore.resumen?.totales.debitos || 0) }}
              </span>

              <span class="text-gray-600 font-medium">Créditos:</span>
              <span class="text-right font-mono font-semibold text-emerald-700">
                {{ formatMoney(cxcStore.resumen?.totales.creditos || 0) }}
              </span>
            </div>

            <div class="my-2 border-t border-gray-300"></div>

            <div class="flex items-center justify-between text-sm font-black">
              <span class="uppercase tracking-wider text-gray-800">Saldo:</span>
              <span
                class="font-mono text-base"
                :class="(cxcStore.resumen?.totales.saldo || 0) > 0 ? 'text-red-700' : 'text-emerald-700'"
              >
                {{ formatMoney(cxcStore.resumen?.totales.saldo || 0) }}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ══ BARRA DE MENÚ Y OPCIONES OPERATIVAS (Réplica de la Imagen) ════════════ -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm print:hidden">

      <!-- Menús desplegables -->
      <div class="flex items-center gap-2">

        <!-- 1. Menú OPCIONES -->
        <div class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 shadow-xs transition hover:bg-gray-100"
            @click="isOpcionesMenuOpen = !isOpcionesMenuOpen"
          >
            <span>⚙️ Opciones</span>
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown Opciones -->
          <div
            v-if="isOpcionesMenuOpen"
            class="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white py-1.5 shadow-2xl"
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
              @click="openModalPago()"
            >
              <span>💵</span> <span>Pagos / Cobros</span>
            </button>

            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-teal-800 hover:bg-teal-50"
              @click="openModalNotaCredito"
            >
              <span>📄</span> <span>Notas de Crédito</span>
            </button>

            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
              @click="onCruzarDevolucionesAuto"
            >
              <span>⚡</span> <span>Cruzar Devoluciones Automáticamente</span>
            </button>

            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-indigo-800 hover:bg-indigo-50"
              @click="openModalAplicarPendientes"
            >
              <span>🔄</span> <span>Aplicar documentos pendientes</span>
            </button>

            <div class="my-1 border-t border-gray-100"></div>

            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-blue-800 hover:bg-blue-50"
              @click="activeFilterStatus = 'PENDIENTE'; isOpcionesMenuOpen = false;"
            >
              <span>📑</span> <span>Ver Facturas Pendientes</span>
            </button>

            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-blue-900 hover:bg-blue-50"
              @click="openModalFactura"
            >
              <span>📑</span> <span>Factura Financiera (CxC)</span>
            </button>

            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-amber-800 hover:bg-amber-50"
              @click="openModalNotaDebito"
            >
              <span>📈</span> <span>Notas de Débito</span>
            </button>

            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100"
              @click="openModalGiro"
            >
              <span>📜</span> <span>Giros</span>
            </button>

            <div class="my-1 border-t border-gray-100"></div>

            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-purple-800 hover:bg-purple-50"
              @click="openModalAdelanto"
            >
              <span>💰</span> <span>Anticipos</span>
            </button>

            <div class="my-1 border-t border-gray-100"></div>

            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
              @click="showConfirmAnular = true; isOpcionesMenuOpen = false;"
            >
              <span>❌</span> <span>Anular última operación</span>
            </button>
          </div>
        </div>

        <!-- 2. Filtro de Tienda / Sucursal -->
        <div class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs">
          <span class="font-bold text-gray-600">🏢 Tienda:</span>
          <select
            v-model="filtroSucursal"
            class="cursor-pointer bg-transparent font-extrabold text-brand focus:outline-none"
          >
            <option value="ALL">Todas las Tiendas</option>
            <option v-for="suc in sucursalesList" :key="suc.id" :value="String(suc.id)">
              {{ suc.nombre }}
            </option>
          </select>
        </div>

        <!-- 3. Menú VER Estado -->
        <div class="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-semibold">
          <button
            type="button"
            class="rounded px-2.5 py-1 transition"
            :class="activeFilterStatus === 'ALL' ? 'bg-white font-bold text-brand shadow-xs' : 'text-gray-600 hover:text-gray-900'"
            @click="activeFilterStatus = 'ALL'"
          >
            Todos
          </button>
          <button
            type="button"
            class="rounded px-2.5 py-1 transition"
            :class="activeFilterStatus === 'PENDIENTE' ? 'bg-white font-bold text-brand shadow-xs' : 'text-gray-600 hover:text-gray-900'"
            @click="activeFilterStatus = 'PENDIENTE'"
          >
            Pendientes
          </button>
          <button
            type="button"
            class="rounded px-2.5 py-1 transition"
            :class="activeFilterStatus === 'PAGADO' ? 'bg-white font-bold text-brand shadow-xs' : 'text-gray-600 hover:text-gray-900'"
            @click="activeFilterStatus = 'PAGADO'"
          >
            Cancelados
          </button>
        </div>

      </div>

      <!-- Acciones de Exportación e Impresión -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800"
          :disabled="!cxcStore.resumen"
          @click="exportExcel"
        >
          📊 Exportar Excel
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-brand-hover"
          @click="handlePrint"
        >
          🖨️ Imprimir Estado
        </button>
      </div>

    </div>

    <!-- Alerta de Devoluciones Pendientes con Botón de Cruce Rápido -->
    <div
      v-if="(cxcStore.resumen?.totales.devolucionesPendientes || 0) > 0"
      class="mb-4 rounded-xl border border-teal-300 bg-teal-50 p-3 text-xs font-semibold text-teal-900 flex flex-wrap items-center justify-between gap-2 shadow-xs"
    >
      <div class="flex items-center gap-2">
        <span class="text-base">🎁</span>
        <span>
          Este cliente tiene <strong class="font-mono text-teal-950 font-bold">${{ formatMoney(cxcStore.resumen?.totales.devolucionesPendientes || 0) }}</strong> en notas de crédito / devoluciones disponibles.
        </span>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition disabled:opacity-50"
        :disabled="cxcStore.isActionLoading"
        @click="onCruzarDevolucionesAuto"
      >
        <span>⚡</span>
        <span>Cruzar con Facturas Pendientes Ahora</span>
      </button>
    </div>

    <!-- Mensajes de feedback -->
    <div
      v-if="cxcStore.actionSuccessMessage"
      class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center justify-between"
    >
      <span>✅ {{ cxcStore.actionSuccessMessage }}</span>
      <button type="button" class="text-emerald-500 hover:text-emerald-700" @click="cxcStore.actionSuccessMessage = null">✕</button>
    </div>

    <div
      v-if="cxcStore.error"
      class="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800 flex items-center justify-between"
    >
      <span>⚠️ {{ cxcStore.error }}</span>
      <button type="button" class="text-red-500 hover:text-red-700" @click="cxcStore.error = null">✕</button>
    </div>

    <!-- ══ TABLA DE MOVIMIENTOS / DOCUMENTOS (Réplica de la Imagen) ═══════════════ -->
    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div v-if="cxcStore.isLoading" class="flex items-center justify-center py-20">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand"></div>
        <span class="ml-3 text-xs text-gray-500 font-semibold">Cargando estado de cuenta del cliente...</span>
      </div>

      <div v-else-if="!selectedClientId" class="py-24 text-center">
        <div class="text-5xl opacity-20">👥</div>
        <h3 class="mt-3 text-sm font-bold text-gray-500">Seleccione un cliente para consultar su cuenta por cobrar</h3>
        <p class="mt-1 text-xs text-gray-400">Use el buscador superior por Código, Cédula o Nombre</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="bg-gray-100 font-bold uppercase tracking-wider text-gray-700">
              <th class="border-b px-3 py-3 whitespace-nowrap">Fecha</th>
              <th class="border-b px-3 py-3 whitespace-nowrap">Tipo</th>
              <th class="border-b px-3 py-3 whitespace-nowrap">Documento #</th>
              <th class="border-b px-3 py-3">Descripción / Concepto</th>
              <th class="border-b px-3 py-3 text-right whitespace-nowrap">Débito (+)</th>
              <th class="border-b px-3 py-3 text-right whitespace-nowrap">Crédito (-)</th>
              <th class="border-b px-3 py-3 text-right whitespace-nowrap">Saldo Pendiente</th>
              <th class="border-b px-3 py-3 text-center whitespace-nowrap">Estado</th>
              <th class="border-b px-3 py-3 text-center whitespace-nowrap print:hidden">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="row in movementsWithRunningBalance"
              :key="row.id"
              class="transition hover:bg-gray-50"
            >
              <td class="px-3 py-2.5 font-mono text-gray-600 whitespace-nowrap">{{ formatDate(row.fecha) }}</td>
              <td class="px-3 py-2.5 whitespace-nowrap">
                <span class="inline-block rounded border px-2 py-0.5 text-[10px] font-bold" :class="getBadgeColor(row.tipo)">
                  {{ row.tipoLabel }}
                </span>
              </td>
              <td class="px-3 py-2.5 font-mono font-bold text-gray-900 whitespace-nowrap">
                <span v-if="row.sucursalSigla" class="mr-1.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-extrabold text-gray-700 border border-gray-300">
                  {{ row.sucursalSigla }}
                </span>
                #{{ row.documentoNumero }}
                <span v-if="row.documentoOrigen" class="block text-[9px] font-normal text-gray-400">Orig: {{ row.documentoOrigen }}</span>
              </td>
              <td class="px-3 py-2.5 text-gray-700">{{ row.descripcion }}</td>
              <td class="px-3 py-2.5 text-right font-mono font-bold text-blue-900 whitespace-nowrap">
                <span v-if="row.debito > 0">{{ formatMoney(row.debito) }}</span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                <span v-if="row.credito > 0">{{ formatMoney(row.credito) }}</span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-3 py-2.5 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                {{ formatMoney(row.saldoPendiente) }}
              </td>
              <td class="px-3 py-2.5 text-center whitespace-nowrap">
                <span
                  class="rounded px-2 py-0.5 text-[10px] font-bold"
                  :class="row.status === 'PAGADO' || row.saldoPendiente === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                >
                  {{ row.status === 'PAGADO' || row.saldoPendiente === 0 ? 'Cancelado' : 'Pendiente' }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-center whitespace-nowrap print:hidden">
                <div class="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-700 border border-gray-300 hover:bg-gray-100 transition shadow-2xs"
                    title="Reimprimir documento / recibo con formato oficial"
                    @click="openPrintMovement(row)"
                  >
                    <span>🖨️</span> <span>Imprimir</span>
                  </button>

                  <button
                    v-if="['FACTURA', 'NOTA_DEBITO'].includes(row.tipo) && row.saldoPendiente > 0"
                    type="button"
                    class="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    @click="openModalPago(row)"
                  >
                    Pagar
                  </button>

                  <button
                    v-if="row.tipo !== 'FACTURA'"
                    type="button"
                    class="rounded bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 border border-red-200 hover:bg-red-100"
                    title="Anular documento y recuperar saldos"
                    @click="requestAnularDoc(row)"
                  >
                    ✕ Anular
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="movementsWithRunningBalance.length === 0">
              <td colspan="9" class="px-4 py-12 text-center text-gray-400">
                No hay movimientos registrados para este cliente.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="movementsWithRunningBalance.length > 0">
            <tr class="border-t-2 border-gray-300 bg-gray-100 font-bold text-gray-900">
              <td colspan="4" class="px-3 py-3 text-right uppercase text-xs">Totales:</td>
              <td class="px-3 py-3 text-right font-mono text-blue-900">{{ formatMoney(cxcStore.resumen?.totales.debitos || 0) }}</td>
              <td class="px-3 py-3 text-right font-mono text-emerald-800">{{ formatMoney(cxcStore.resumen?.totales.creditos || 0) }}</td>
              <td class="px-3 py-3 text-right font-mono text-red-800">{{ formatMoney(cxcStore.resumen?.totales.saldo || 0) }}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════
         MODAL 1: VENTANA DE PAGOS O ABONOS (Réplica de la Imagen de Referencia)
         ══════════════════════════════════════════════════════════════════════ -->
    <div v-if="showModalPago" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
      <div class="w-full max-w-4xl overflow-hidden rounded-lg border border-gray-400 bg-gray-200 text-gray-900 shadow-2xl font-sans text-xs">

        <!-- Barra de Título estilo Windows / ERP Clásico -->
        <div class="flex items-center justify-between bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 px-3 py-1.5 text-white">
          <div class="flex items-center gap-2">
            <span class="text-sm">💵</span>
            <span class="font-bold tracking-wide">Pagos o Abonos.</span>
          </div>
          <button
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded hover:bg-red-600 text-gray-200 font-bold"
            @click="showModalPago = false"
          >
            ✕
          </button>
        </div>

        <div class="p-3 bg-gray-200 space-y-3">

          <!-- Fila de Cliente -->
          <div class="flex items-center gap-2">
            <label class="w-20 font-black text-gray-900 text-xs">Clientes :</label>
            <div class="flex-1 rounded border border-gray-400 bg-white px-3 py-1 font-bold text-gray-900 uppercase shadow-inner">
              {{ cxcStore.resumen?.cliente.nombre || (selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'JOSE DE LOS SANTOS GAMBOA OJEDA') }}
            </div>
          </div>

          <!-- Fila de Formulario Superior: Izquierda (Inputs) + Derecha (Resumen Box) -->
          <div class="grid grid-cols-12 gap-3 items-start">

            <!-- Inputs Izquierda -->
            <div class="col-span-12 md:col-span-7 space-y-2">
              <div class="flex items-center gap-2">
                <label class="w-36 font-semibold text-gray-800">Fecha Operación :</label>
                <input
                  v-model="pagoForm.fechaOperacion"
                  type="date"
                  class="rounded border border-gray-400 bg-white px-2 py-1 font-mono text-xs font-bold text-gray-900 shadow-inner outline-none"
                />
              </div>

              <div class="flex items-center gap-2">
                <label class="w-36 font-semibold text-gray-800">Moneda :</label>
                <select
                  v-model="pagoForm.monedaId"
                  class="flex-1 rounded border border-gray-400 bg-white px-2 py-1 font-bold text-blue-900 shadow-inner outline-none"
                >
                  <option :value="1">$ Dólares</option>
                  <option :value="2">Bs. Bolívares</option>
                </select>
              </div>

              <div class="flex items-center gap-2">
                <label class="w-36 font-semibold text-gray-800">Monto del Pago :</label>
                <div class="flex items-center gap-1 flex-1">
                  <input
                    v-model.number="pagoForm.monto_total"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    class="w-full rounded border border-gray-400 bg-white px-2 py-1 text-right font-mono text-xs font-black text-blue-900 shadow-inner outline-none"
                    @input="onMontoPagoTopInput"
                  />
                  <span class="rounded border border-gray-400 bg-gray-100 px-1.5 py-1 text-[11px] font-mono font-bold text-gray-600">🖩</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <label class="w-36 font-semibold text-gray-800">Factor de Cambio :</label>
                <div class="flex items-center gap-1 flex-1">
                  <input
                    v-model.number="pagoForm.factorCambio"
                    type="number"
                    step="0.000001"
                    class="w-full rounded border border-gray-400 bg-white px-2 py-1 text-right font-mono text-xs font-bold text-gray-900 shadow-inner outline-none"
                  />
                  <span class="rounded border border-gray-400 bg-gray-100 px-1.5 py-1 text-[11px] font-mono font-bold text-gray-600">🖩</span>
                </div>
              </div>
            </div>

            <!-- Caja Resumen Derecha (Exacta a la Imagen) -->
            <div class="col-span-12 md:col-span-5 rounded border border-gray-400 bg-white p-2.5 shadow-sm text-xs space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-700">Documento No.</span>
                <span class="font-mono font-bold text-gray-900">{{ pagoForm.documentoNo }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-700">Total Documentos :</span>
                <span class="font-mono font-bold text-gray-900">{{ pagoDocumentos.length }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-700">Total Saldo :</span>
                <span class="font-mono font-bold text-gray-900">{{ formatMoney(totalSaldoDocumentos) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-700">Total Intereses de Mora :</span>
                <span class="font-mono text-gray-600">0,00</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-700">Total Descuentos :</span>
                <span class="font-mono text-gray-600">{{ formatMoney(totalDescuentosPago) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-700">Total Retención :</span>
                <span class="font-mono text-gray-600">{{ formatMoney(totalRetencionesPago) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-700">Total Anticipos Pendientes :</span>
                <span class="font-mono font-bold text-purple-800">{{ formatMoney(cxcStore.resumen?.totales.adelantos || 0) }}</span>
              </div>
            </div>

          </div>

          <!-- Pestaña / Header Secundario -->
          <div class="border-b border-gray-400 pt-1">
            <span class="inline-block border-b-2 border-gray-700 pb-1 font-bold text-gray-800 text-xs pl-1">
              Descuentos
            </span>
          </div>

          <!-- Tabla de Documentos a Pagar (Réplica Fiel de la Imagen) -->
          <div class="max-h-64 overflow-y-auto overflow-x-auto rounded border border-gray-400 bg-gray-300">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-gray-200 border-b border-gray-400 text-[11px] font-bold text-gray-800">
                  <th class="p-1.5 text-center w-8 border-r border-gray-400"></th>
                  <th class="p-1.5 border-r border-gray-400 whitespace-nowrap">
                    <div>Emisión</div>
                    <div class="text-red-700">Vencimiento</div>
                  </th>
                  <th class="p-1.5 border-r border-gray-400 text-center whitespace-nowrap">Tipo</th>
                  <th class="p-1.5 border-r border-gray-400 whitespace-nowrap">
                    <div>Número</div>
                    <div class="text-gray-600 font-normal">Monedas</div>
                  </th>
                  <th class="p-1.5 border-r border-gray-400 text-right whitespace-nowrap">Monto Original</th>
                  <th class="p-1.5 border-r border-gray-400 text-right whitespace-nowrap">Saldo</th>
                  <th class="p-1.5 border-r border-gray-400 text-right whitespace-nowrap">
                    <div>Descuento</div>
                    <div>Saldo Total</div>
                  </th>
                  <th class="p-1.5 text-right whitespace-nowrap bg-blue-100 border-l border-gray-400">
                    <div>Retención</div>
                    <div class="text-blue-900 font-bold">Pago</div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-400 bg-gray-200 font-mono text-[11px]">
                <tr
                  v-for="row in pagoDocumentos"
                  :key="row.cxcId"
                  class="hover:bg-gray-100 transition"
                  :class="row.selected ? 'bg-blue-50/80 font-semibold' : ''"
                >
                  <!-- Checkbox -->
                  <td class="p-1.5 text-center border-r border-gray-400">
                    <input
                      type="checkbox"
                      v-model="row.selected"
                      class="h-3.5 w-3.5 cursor-pointer accent-blue-700"
                      @change="onTogglePagoRow(row)"
                    />
                  </td>

                  <!-- Emisión / Vencimiento -->
                  <td class="p-1.5 border-r border-gray-400 whitespace-nowrap">
                    <div class="text-gray-900">{{ formatDate(row.emision) }}</div>
                    <div class="text-red-700 font-bold">{{ formatDate(row.vencimiento) }}</div>
                  </td>

                  <!-- Tipo -->
                  <td class="p-1.5 border-r border-gray-400 text-center font-bold text-gray-800 whitespace-nowrap">
                    {{ row.tipo }}
                  </td>

                  <!-- Número / Monedas -->
                  <td class="p-1.5 border-r border-gray-400 whitespace-nowrap">
                    <div class="font-bold text-gray-900">{{ row.numero }}</div>
                    <div class="font-sans text-[10px] text-gray-600">{{ row.moneda }}</div>
                  </td>

                  <!-- Monto Original -->
                  <td class="p-1.5 border-r border-gray-400 text-right font-bold text-gray-800 whitespace-nowrap">
                    {{ formatMoney(row.montoOriginal) }}
                  </td>

                  <!-- Saldo -->
                  <td class="p-1.5 border-r border-gray-400 text-right font-bold text-gray-900 whitespace-nowrap">
                    {{ formatMoney(row.saldo) }}
                  </td>

                  <!-- Descuento / Saldo Total -->
                  <td class="p-1.5 border-r border-gray-400 text-right whitespace-nowrap">
                    <div class="text-gray-600">{{ formatMoney(row.descuento) }}</div>
                    <div class="font-bold text-gray-900">{{ formatMoney(row.saldoTotal) }}</div>
                  </td>

                  <!-- Retención / Pago Editable (Celda Azul) -->
                  <td class="p-1.5 text-right whitespace-nowrap bg-blue-100 border-l border-gray-400">
                    <div class="text-gray-600 text-[10px]">{{ formatMoney(row.retencion) }}</div>
                    <input
                      v-model.number="row.montoPago"
                      type="number"
                      step="0.01"
                      min="0"
                      :max="row.saldo"
                      class="w-24 rounded border border-blue-400 bg-white px-1.5 py-0.5 text-right font-mono text-xs font-black text-blue-900 outline-none focus:ring-1 focus:ring-blue-600"
                      @input="onRowMontoPagoChange(row)"
                    />
                  </td>
                </tr>

                <tr v-if="pagoDocumentos.length === 0">
                  <td colspan="8" class="p-6 text-center text-gray-500 font-sans font-medium">
                    No hay documentos o facturas pendientes de cobro para este cliente.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Botones Inferiores: Totalizar y Cancelar (Réplica de la Imagen) -->
          <div class="flex items-center justify-start gap-3 pt-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded border border-gray-400 bg-gray-100 px-4 py-1.5 font-bold text-gray-800 shadow-xs hover:bg-gray-200 active:translate-y-px disabled:opacity-50"
              :disabled="cxcStore.isActionLoading || pagoDocumentos.length === 0"
              @click="submitPago"
            >
              <span>💾</span>
              <span>Totalizar</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded border border-gray-400 bg-gray-100 px-4 py-1.5 font-bold text-gray-800 shadow-xs hover:bg-gray-200 active:translate-y-px"
              @click="showModalPago = false"
            >
              <span class="text-red-600 font-black">✕</span>
              <span>Cancelar</span>
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════
         MODAL 2: NOTA DE CRÉDITO
         ══════════════════════════════════════════════════════════════════════ -->
    <div v-if="showModalNotaCredito" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 class="text-base font-black text-gray-900">📄 Generar Nota de Crédito</h2>
        <p class="text-xs text-gray-500 mb-4">Disminuye la deuda de una factura o crea saldo a favor</p>

        <form @submit.prevent="submitNotaCredito" class="space-y-3 text-xs">
          <div>
            <label class="mb-1 block font-bold text-gray-700">Aplicar a Documento (Opcional):</label>
            <select v-model="ncForm.cxc_id" class="w-full rounded-lg border border-gray-300 p-2 outline-none">
              <option :value="undefined">Sin aplicar (Dejar como Crédito / Saldo a Favor)</option>
              <option v-for="d in pendingDebits" :key="d.id" :value="typeof d.id === 'string' ? Number(d.id.replace('cxc-', '')) : d.id">
                #{{ d.documentoNumero }} (Saldo: ${{ formatMoney(d.saldoPendiente) }})
              </option>
            </select>
          </div>

          <div>
            <label class="mb-1 block font-bold text-gray-700">Monto de la Nota de Crédito:</label>
            <input v-model.number="ncForm.monto" type="number" step="0.01" min="0.01" class="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold text-teal-800" required />
          </div>

          <div>
            <label class="mb-1 block font-bold text-gray-700">Motivo / Concepto:</label>
            <input v-model="ncForm.motivo" type="text" placeholder="Devolución, descuento por pronto pago..." class="w-full rounded-lg border border-gray-300 p-2" required />
          </div>

          <div class="mt-4 flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" class="rounded-lg bg-gray-100 px-4 py-2 font-bold text-gray-600" @click="showModalNotaCredito = false">Cancelar</button>
            <button type="submit" class="rounded-lg bg-teal-700 px-4 py-2 font-bold text-white hover:bg-teal-800" :disabled="cxcStore.isActionLoading">
              {{ cxcStore.isActionLoading ? 'Generando...' : 'Generar Nota de Crédito' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════
         MODAL 3: NOTA DE DÉBITO
         ══════════════════════════════════════════════════════════════════════ -->
    <div v-if="showModalNotaDebito" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 class="text-base font-black text-gray-900">📈 Generar Nota de Débito</h2>
        <p class="text-xs text-gray-500 mb-4">Incrementa la cuenta por cobrar (intereses, recargos)</p>

        <form @submit.prevent="submitNotaDebito" class="space-y-3 text-xs">
          <div>
            <label class="mb-1 block font-bold text-gray-700">Monto del Débito:</label>
            <input v-model.number="ndForm.monto" type="number" step="0.01" min="0.01" class="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold text-amber-800" required />
          </div>

          <div>
            <label class="mb-1 block font-bold text-gray-700">Concepto / Motivo:</label>
            <input v-model="ndForm.motivo" type="text" placeholder="Intereses de mora, gastos de cobranza..." class="w-full rounded-lg border border-gray-300 p-2" required />
          </div>

          <div class="mt-4 flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" class="rounded-lg bg-gray-100 px-4 py-2 font-bold text-gray-600" @click="showModalNotaDebito = false">Cancelar</button>
            <button type="submit" class="rounded-lg bg-amber-700 px-4 py-2 font-bold text-white hover:bg-amber-800" :disabled="cxcStore.isActionLoading">
              {{ cxcStore.isActionLoading ? 'Generando...' : 'Generar Nota de Débito' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════
         MODAL 4: REGISTRAR ANTICIPO
         ══════════════════════════════════════════════════════════════════════ -->
    <div v-if="showModalAdelanto" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 class="text-base font-black text-gray-900">💰 Registrar Anticipo</h2>
        <p class="text-xs text-gray-500 mb-4">Crea un saldo a favor que podrá cruzarse contra facturas</p>

        <form @submit.prevent="submitAdelanto" class="space-y-3 text-xs">
          <div>
            <label class="mb-1 block font-bold text-gray-700">Monto del Anticipo:</label>
            <input v-model.number="adelantoForm.monto" type="number" step="0.01" min="0.01" class="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold text-purple-800" required />
          </div>

          <div>
            <label class="mb-1 block font-bold text-gray-700">Concepto / Referencia:</label>
            <input v-model="adelantoForm.motivo" type="text" placeholder="Anticipo por pedido #..." class="w-full rounded-lg border border-gray-300 p-2" required />
          </div>

          <div class="mt-4 flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" class="rounded-lg bg-gray-100 px-4 py-2 font-bold text-gray-600" @click="showModalAdelanto = false">Cancelar</button>
            <button type="submit" class="rounded-lg bg-purple-700 px-4 py-2 font-bold text-white hover:bg-purple-800" :disabled="cxcStore.isActionLoading">
              {{ cxcStore.isActionLoading ? 'Registrando...' : 'Registrar Anticipo' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════
         MODAL 5: GIRO
         ══════════════════════════════════════════════════════════════════════ -->
    <div v-if="showModalGiro" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 class="text-base font-black text-gray-900">📜 Registrar Giro</h2>
        <p class="text-xs text-gray-500 mb-4">Crea un documento de giro mercantil por cobrar</p>

        <form @submit.prevent="submitGiro" class="space-y-3 text-xs">
          <div>
            <label class="mb-1 block font-bold text-gray-700">Monto del Giro:</label>
            <input v-model.number="giroForm.monto" type="number" step="0.01" min="0.01" class="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold text-indigo-800" required />
          </div>

          <div>
            <label class="mb-1 block font-bold text-gray-700">Fecha de Vencimiento:</label>
            <input v-model="giroForm.fecha_vencimiento" type="date" class="w-full rounded-lg border border-gray-300 p-2" required />
          </div>

          <div class="mt-4 flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" class="rounded-lg bg-gray-100 px-4 py-2 font-bold text-gray-600" @click="showModalGiro = false">Cancelar</button>
            <button type="submit" class="rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white hover:bg-indigo-800" :disabled="cxcStore.isActionLoading">
              {{ cxcStore.isActionLoading ? 'Registrando...' : 'Registrar Giro' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════
         MODAL 6: APLICAR / CRUZAR DOCUMENTOS PENDIENTES
         ══════════════════════════════════════════════════════════════════════ -->
    <div v-if="showModalAplicarPendientes" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <h2 class="text-base font-black text-gray-900">🔄 Cruzar / Aplicar Documentos Pendientes</h2>
        <p class="text-xs text-gray-500 mb-4">Aplica el saldo de un anticipo o nota de crédito a facturas pendientes</p>

        <form @submit.prevent="submitAplicarPendientes" class="space-y-3 text-xs">
          <div>
            <label class="mb-1 block font-bold text-gray-700">Seleccionar Saldo a Favor / Crédito:</label>
            <select v-model="aplicarForm.credito_cxc_id" class="w-full rounded-lg border border-gray-300 p-2 font-bold text-purple-900" required>
              <option v-for="c in pendingCredits" :key="c.id" :value="typeof c.id === 'string' ? Number(c.id.replace('cxc-', '')) : c.id">
                #{{ c.documentoNumero }} (Disponible: ${{ formatMoney(c.saldoPendiente) }}) - {{ c.tipoLabel }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-2 block font-bold text-gray-700">Facturas / Débitos a Descontar:</label>
            <div class="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-gray-200 p-2">
              <div
                v-for="(app, idx) in aplicarForm.aplicaciones"
                :key="app.debito_cxc_id"
                class="flex items-center justify-between gap-2 border-b border-gray-100 pb-1.5"
              >
                <span class="font-medium text-gray-700">
                  #{{ pendingDebits[idx]?.documentoNumero }} (Saldo: ${{ formatMoney(pendingDebits[idx]?.saldoPendiente || 0) }})
                </span>
                <input
                  v-model.number="app.monto"
                  type="number"
                  step="0.01"
                  min="0"
                  :max="pendingDebits[idx]?.saldoPendiente"
                  placeholder="Monto a aplicar"
                  class="w-28 rounded border border-gray-300 px-2 py-1 text-right font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div class="mt-4 flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" class="rounded-lg bg-gray-100 px-4 py-2 font-bold text-gray-600" @click="showModalAplicarPendientes = false">Cancelar</button>
            <button type="submit" class="rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white hover:bg-indigo-800" :disabled="cxcStore.isActionLoading">
              {{ cxcStore.isActionLoading ? 'Aplicando...' : 'Confirmar Cruce' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════
         MODAL 7: CONFIRMAR ANULACIÓN
         ══════════════════════════════════════════════════════════════════════ -->
    <div v-if="showConfirmAnular" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-center">
        <div class="text-4xl mb-2">⚠️</div>
        <h2 class="text-base font-black text-gray-900">¿Anular Última Operación?</h2>
        <p class="text-xs text-gray-500 my-3">
          Se revertirá la última transacción registrada para este cliente y se restaurarán los saldos pendientes originales.
        </p>

        <div class="flex justify-center gap-2 pt-2">
          <button type="button" class="rounded-lg bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600" @click="showConfirmAnular = false">Cancelar</button>
          <button type="button" class="rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800" @click="executeAnularUltima">
            Sí, Anular
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════
         MODAL 8: CONFIRMACIÓN DE ANULAR DOCUMENTO ESPECÍFICO
         ══════════════════════════════════════════════════════════════════════ -->
    <div v-if="showModalAnularDoc && docToAnular" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-2xl">
            ⚠️
          </div>
          <div>
            <h2 class="text-base font-black text-gray-900">¿Anular {{ docToAnular.tipo }} #{{ docToAnular.numero }}?</h2>
            <p class="text-xs font-semibold text-gray-500">Monto: ${{ formatMoney(docToAnular.monto) }}</p>
          </div>
        </div>

        <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
          <p class="font-bold">✨ Protección y Recuperación de Saldos:</p>
          <ul class="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
            <li>Si este documento cruzó anticipos, los <strong>anticipos se restablecerán</strong> a favor del cliente sin quedar quemados.</li>
            <li>Las facturas aplicadas volverán a su <strong>saldo pendiente original</strong>.</li>
          </ul>
        </div>

        <div class="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            class="rounded-lg bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
            @click="showModalAnularDoc = false; docToAnular = null;"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            :disabled="cxcStore.isActionLoading"
            @click="confirmAnularDoc"
          >
            {{ cxcStore.isActionLoading ? 'Anulando...' : 'Confirmar Anulación' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════
         MODAL 9: FACTURA FINANCIERA / CXC (SIN AFECTAR INVENTARIO)
         ══════════════════════════════════════════════════════════════════════ -->
    <div v-if="showModalFactura" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">📑</span>
            <div>
              <h2 class="text-base font-black text-gray-900">Factura Financiera (CxC)</h2>
              <p class="text-[11px] font-semibold text-blue-600">Aumenta la deuda por cobrar sin descontar inventario</p>
            </div>
          </div>
          <button type="button" class="text-gray-400 hover:text-gray-600 font-bold" @click="showModalFactura = false">✕</button>
        </div>

        <form @submit.prevent="submitFactura" class="mt-4 space-y-3 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">Tienda / Sucursal Emisora *</label>
            <select
              v-model.number="facturaForm.sucursal_id"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 font-semibold outline-none focus:border-brand"
            >
              <option v-for="suc in sucursalesList" :key="suc.id" :value="suc.id">
                {{ suc.nombre }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-gray-700 mb-1">Monto de la Factura *</label>
              <input
                v-model.number="facturaForm.monto"
                type="number"
                step="0.01"
                min="0.01"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono font-bold text-gray-900 outline-none focus:border-brand"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1">Moneda</label>
              <select
                v-model.number="facturaForm.moneda_id"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
              >
                <option v-for="cur in currenciesStore.currencies" :key="cur.id" :value="Number(cur.id)">
                  {{ cur.code }} - {{ cur.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-gray-700 mb-1">Nº Factura (Opcional)</label>
              <input
                v-model="facturaForm.numero_documento"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono outline-none focus:border-brand"
                placeholder="Auto: FF-SIGLA-00000001"
              />
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1">Fecha Vencimiento</label>
              <input
                v-model="facturaForm.fecha_vencimiento"
                type="date"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">Concepto / Motivo</label>
            <input
              v-model="facturaForm.motivo"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
              placeholder="Ej. Facturación de servicios, saldo inicial, honorarios..."
            />
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">Observaciones</label>
            <textarea
              v-model="facturaForm.observaciones"
              rows="2"
              class="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
              placeholder="Detalles adicionales..."
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              class="rounded-lg bg-gray-100 px-4 py-2 font-bold text-gray-600 hover:bg-gray-200"
              @click="showModalFactura = false"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800"
              :disabled="cxcStore.isActionLoading"
            >
              {{ cxcStore.isActionLoading ? 'Generando...' : '💾 Generar Factura' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ══ MODAL DE REIMPRESIÓN: RECIBOS DE COBRO Y COMPROBANTES DE CRUCE ═════════ -->
    <ReciboCobroPrintPreview
      v-if="showPrintReciboModal && printReciboData"
      :recibo="printReciboData"
      :customer="cxcStore.resumen?.cliente"
      :company="companyFor(printReciboData.sucursalId)"
      @close="showPrintReciboModal = false"
    />

    <!-- ══ MODAL DE REIMPRESIÓN: DOCUMENTOS CXC (NC, ND, ADELANTOS, GIROS) ════════ -->
    <DocumentoCxCPrintPreview
      v-if="showPrintDocModal && printDocData"
      :documento="printDocData"
      :customer="cxcStore.resumen?.cliente"
      :company="companyFor(printDocData.sucursalId)"
      @close="showPrintDocModal = false"
    />

  </div>
</template>
