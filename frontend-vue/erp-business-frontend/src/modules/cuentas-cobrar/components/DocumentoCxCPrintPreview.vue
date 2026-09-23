<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { formatMoney, isBolivares } from '@/utils/money';
import type { CompanyInfo } from '@/composables/useCompanyInfo';
import type { ClienteCxCInfo } from '../interfaces/cuenta-cobrar.interface';

interface DocumentoPrintData {
  id: string | number;
  tipo: string;
  tipoLabel?: string;
  documentoNumero: string;
  documentoOrigen?: string | null;
  fecha: string;
  fechaVencimiento?: string | null;
  descripcion: string;
  monedaId: number;
  tasaCambio: number;
  monto: number;
  saldoPendiente: number;
  status: string;
  sucursalNombre?: string;
  sucursalSigla?: string;
}

interface DocumentoCxCPrintProps {
  documento: DocumentoPrintData;
  company: CompanyInfo | null;
  customer?: ClienteCxCInfo | null;
}

const props = defineProps<DocumentoCxCPrintProps>();

const emit = defineEmits<{
  close: [];
}>();

const currenciesStore = useCurrenciesStore();

onMounted(() => {
  if (currenciesStore.currencies.length === 0) currenciesStore.fetchCurrencies();
});

function handlePrint(): void {
  window.print();
}

const currencyCode = computed<string>(() => {
  const c = currenciesStore.currencies.find(
    (cur) => cur.id === String(props.documento.monedaId) || cur.code === String(props.documento.monedaId),
  );
  return c?.code ?? 'USD';
});

const documentTitle = computed<string>(() => {
  switch (props.documento.tipo) {
    case 'NOTA_CREDITO':
      return 'COMPROBANTE DE NOTA DE CRÉDITO';
    case 'NOTA_DEBITO':
      return 'COMPROBANTE DE NOTA DE DÉBITO';
    case 'ADELANTO':
      return 'COMPROBANTE DE ADELANTO / ANTICIPO';
    case 'GIRO':
      return 'GIRO COMERCIAL / CUENTA POR COBRAR';
    case 'FACTURA':
    case 'FACTURA_FINANCIERA':
      return 'COMPROBANTE DE FACTURA / CARGO CxC';
    case 'DEVOLUCION':
      return 'COMPROBANTE DE DEVOLUCIÓN DE CLIENTE';
    case 'AJUSTE':
      return 'COMPROBANTE DE AJUSTE DE CUENTA';
    default:
      return `COMPROBANTE DE ${props.documento.tipoLabel || props.documento.tipo}`.toUpperCase();
  }
});

const isCredito = computed<boolean>(() => {
  return ['NOTA_CREDITO', 'ADELANTO', 'DEVOLUCION'].includes(props.documento.tipo);
});

const totalInBs = computed<number>(() => {
  if (isBolivares(currencyCode.value)) {
    return props.documento.monto;
  }
  return props.documento.monto * (props.documento.tasaCambio || 1);
});

const totalInUsd = computed<number>(() => {
  if (!isBolivares(currencyCode.value)) {
    return props.documento.monto;
  }
  const tasa = props.documento.tasaCambio || 1;
  return tasa > 0 ? props.documento.monto / tasa : props.documento.monto;
});
</script>

<template>
  <Teleport to="body">
    <div class="doc-cxc-print-overlay fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 px-4 py-8">
      <div class="mx-auto max-w-3xl">

        <!-- Screen Action Bar -->
        <div class="print:hidden mb-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-md border border-gray-200">
          <div class="flex items-center gap-2">
            <span class="text-xl">📄</span>
            <span class="text-sm font-bold text-gray-800">
              Vista Previa de Impresión — {{ documentTitle }} #{{ props.documento.documentoNumero }}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-xs transition hover:bg-gray-50"
              @click="emit('close')"
            >
              ✕ Cerrar
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand-hover"
              @click="handlePrint"
            >
              <span>🖨️</span> <span>Imprimir Documento</span>
            </button>
          </div>
        </div>

        <!-- Printable Sheet -->
        <div class="doc-cxc-print-sheet rounded-xl bg-white p-8 shadow-2xl border border-gray-100 font-sans text-gray-800 text-xs leading-relaxed">

          <!-- 1. Encabezado de la Empresa y Título -->
          <header class="mb-6 flex items-start justify-between border-b-2 border-gray-800 pb-4">
            <div class="max-w-[60%]">
              <h1 class="text-base font-black uppercase tracking-tight text-gray-950">
                {{ props.company?.nombre || 'ERP BUSINESS' }}
              </h1>
              <p v-if="props.company?.rif" class="font-bold text-gray-700 text-[11px]">
                RIF: {{ props.company.rif }}
              </p>
              <p v-if="props.company?.sucursalNombre || props.documento.sucursalNombre" class="text-[11px] font-semibold text-brand">
                Sucursal: {{ props.documento.sucursalNombre || props.company?.sucursalNombre }}
              </p>
              <p v-if="props.company?.direccionFiscal" class="text-[10px] text-gray-500 mt-0.5 leading-snug">
                {{ props.company.direccionFiscal }}
              </p>
              <p v-if="props.company?.telefono || props.company?.email" class="text-[10px] text-gray-500">
                {{ [props.company?.telefono, props.company?.email].filter(Boolean).join(' · ') }}
              </p>
            </div>

            <div class="text-right">
              <span
                class="inline-block rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border"
                :class="isCredito ? 'bg-teal-50 text-teal-900 border-teal-200' : 'bg-blue-50 text-blue-900 border-blue-200'"
              >
                {{ documentTitle }}
              </span>
              <h2 class="mt-1 text-base font-mono font-black text-gray-900">
                #{{ props.documento.documentoNumero }}
              </h2>
              <p class="text-[11px] font-semibold text-gray-600 mt-1">
                Fecha Emisión: {{ props.documento.fecha }}
              </p>
              <p v-if="props.documento.fechaVencimiento" class="text-[11px] font-medium text-amber-800">
                Vencimiento: {{ props.documento.fechaVencimiento }}
              </p>
              <p v-if="props.documento.documentoOrigen" class="text-[10px] text-gray-500 mt-0.5">
                Ref. Origen: <strong>{{ props.documento.documentoOrigen }}</strong>
              </p>
            </div>
          </header>

          <!-- 2. Datos del Cliente -->
          <section class="mb-5 rounded-lg bg-gray-50 p-3.5 border border-gray-200">
            <div class="grid grid-cols-12 gap-4">
              <div class="col-span-8 space-y-1">
                <p class="text-[10px] font-black uppercase tracking-wider text-gray-500">Datos del Cliente</p>
                <p class="text-sm font-bold text-gray-900">{{ props.customer?.nombre || 'Cliente General' }}</p>
                <p class="text-[11px] font-mono text-gray-700">
                  <span class="font-semibold text-gray-500">Doc / RIF:</span>
                  {{ props.customer ? `${props.customer.tipoDocumento}-${props.customer.numeroDocumento}` : '—' }}
                </p>
                <p v-if="props.customer?.direccion" class="text-[10px] text-gray-500">
                  <span class="font-semibold text-gray-500">Dirección:</span> {{ props.customer.direccion }}
                </p>
              </div>

              <div class="col-span-4 text-right space-y-1">
                <p class="text-[10px] font-black uppercase tracking-wider text-gray-500">Estado en Cuenta</p>
                <span
                  class="inline-block rounded px-2 py-0.5 text-[10px] font-bold"
                  :class="props.documento.status === 'PAGADO' || props.documento.saldoPendiente === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                >
                  {{ props.documento.status === 'PAGADO' || props.documento.saldoPendiente === 0 ? 'LIQUIDADO / CANCELADO' : 'PENDIENTE' }}
                </span>
                <p class="text-[11px] font-mono text-gray-600">
                  Moneda: <strong>{{ currencyCode }}</strong>
                </p>
                <p v-if="props.documento.tasaCambio && props.documento.tasaCambio > 1" class="text-[10px] font-mono text-gray-500">
                  Tasa: {{ Number(props.documento.tasaCambio).toFixed(2) }} Bs./$
                </p>
              </div>
            </div>
          </section>

          <!-- 3. Concepto y Descripción del Documento -->
          <section class="mb-5 rounded-lg border border-gray-200 p-3.5">
            <h3 class="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
              Concepto / Motivo de la Operación
            </h3>
            <p class="text-xs text-gray-800 font-medium leading-relaxed">
              {{ props.documento.descripcion || 'Registro administrativo en el módulo de Cuentas por Cobrar.' }}
            </p>
          </section>

          <!-- 4. Cuadro de Liquidación de Montos -->
          <section class="mb-6 grid grid-cols-12 gap-4">
            <div class="col-span-6 rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-1.5 text-xs">
              <p class="text-[10px] font-black uppercase tracking-wider text-gray-500">Efecto Contable</p>
              <p class="text-xs font-semibold text-gray-700">
                Tipo de Movimiento:
                <strong :class="isCredito ? 'text-teal-800' : 'text-blue-900'">
                  {{ isCredito ? 'Crédito a Favor del Cliente (-)' : 'Débito / Cargo por Cobrar (+)' }}
                </strong>
              </p>
              <p class="text-[11px] text-gray-600">
                Saldo Pendiente Actual:
                <strong class="font-mono font-bold text-gray-900">
                  {{ formatMoney(props.documento.saldoPendiente, currencyCode) }}
                </strong>
              </p>
            </div>

            <div class="col-span-6 rounded-lg border-2 border-gray-800 bg-gray-50 p-3 space-y-1 text-right text-xs">
              <div class="flex justify-between items-baseline">
                <span class="font-bold text-gray-700 uppercase text-xs">Monto Total Documento:</span>
                <span class="font-mono font-black text-lg text-gray-950">
                  {{ formatMoney(props.documento.monto, currencyCode) }}
                </span>
              </div>

              <!-- Conversión de Referencia -->
              <div class="pt-1.5 border-t border-dashed border-gray-300 text-[10px] text-gray-500 space-y-0.5 font-mono">
                <p>Equiv. en Bolívares: <strong class="text-gray-800 font-bold">Bs. {{ totalInBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></p>
                <p>Equiv. en Dólares: <strong class="text-gray-800 font-bold">$ {{ totalInUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></p>
              </div>
            </div>
          </section>

          <!-- 5. Firmas Oficiales -->
          <footer class="pt-12 border-t border-gray-200">
            <div class="grid grid-cols-3 gap-8 text-center text-xs text-gray-700">
              <div>
                <div class="border-t border-gray-800 pt-1.5 font-bold uppercase tracking-wider text-[10px]">
                  Elaborado por
                </div>
                <p class="text-[10px] text-gray-400 mt-0.5">Operador / Caja</p>
              </div>

              <div>
                <div class="border-t border-gray-800 pt-1.5 font-bold uppercase tracking-wider text-[10px]">
                  Autorizado por
                </div>
                <p class="text-[10px] text-gray-400 mt-0.5">Gerencia / Administración</p>
              </div>

              <div>
                <div class="border-t border-gray-800 pt-1.5 font-bold uppercase tracking-wider text-[10px]">
                  Firma y Sello Cliente
                </div>
                <p class="text-[10px] text-gray-400 mt-0.5">Conforme</p>
              </div>
            </div>

            <div class="mt-8 text-center text-[9px] text-gray-400">
              Documento emitido por ERP Business · Sistema Integral de Gestión Empresarial
            </div>
          </footer>

        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@media print {
  .doc-cxc-print-overlay {
    position: static !important;
    background: transparent !important;
    padding: 0 !important;
    overflow: visible !important;
    inset: auto !important;
  }

  .doc-cxc-print-sheet {
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    max-width: 100% !important;
  }
}
</style>
