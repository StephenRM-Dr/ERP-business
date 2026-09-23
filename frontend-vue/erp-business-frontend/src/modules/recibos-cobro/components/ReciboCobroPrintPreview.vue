<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useBancoStore } from '@/modules/master/bancos/interfaces/banco.store';
import { useCuentaBancariaStore } from '@/modules/master/cuentas-bancarias/interfaces/cuenta-bancaria.store';
import { formatMoney, isBolivares } from '@/utils/money';
import type { CompanyInfo } from '@/composables/useCompanyInfo';
import type { ReciboCobro } from '../interfaces/recibo-cobro.interface';

interface CustomerPrintInfo {
  id?: string | number;
  nombre?: string;
  firstName?: string;
  lastName?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  documentType?: string;
  documentNumber?: string;
  direccion?: string;
  address?: string;
  telefono?: string;
  phone?: string;
  email?: string;
}

interface ReciboCobroPrintProps {
  recibo: ReciboCobro;
  company: CompanyInfo | null;
  customer?: CustomerPrintInfo | null;
}

const props = defineProps<ReciboCobroPrintProps>();

const emit = defineEmits<{
  close: [];
}>();

const currenciesStore = useCurrenciesStore();
const cuentaBancariaStore = useCuentaBancariaStore();
const bancoStore = useBancoStore();

onMounted(() => {
  if (currenciesStore.currencies.length === 0) currenciesStore.fetchCurrencies();
  if (cuentaBancariaStore.cuentaList.length === 0) cuentaBancariaStore.fetchCuentas();
  if (bancoStore.bancoList.length === 0) bancoStore.fetchBancos();
});

function handlePrint(): void {
  window.print();
}

const currencyCode = computed<string>(() => {
  const c = currenciesStore.currencies.find(
    (cur) => cur.id === String(props.recibo.monedaPagoId) || cur.code === String(props.recibo.monedaPagoId),
  );
  return c?.code ?? 'USD';
});

const isCruce = computed<boolean>(() => {
  return (
    props.recibo.numeroRecibo?.startsWith('CRU-') ||
    props.recibo.formaPago === 'ANTICIPO' ||
    (props.recibo.observaciones || '').includes('[CRUCE_DOCUMENTOS]')
  );
});

const customerDisplayName = computed<string>(() => {
  if (!props.customer) return `Cliente #${props.recibo.clienteId}`;
  if (props.customer.nombre) return props.customer.nombre;
  if (props.customer.firstName || props.customer.lastName) {
    return `${props.customer.firstName || ''} ${props.customer.lastName || ''}`.trim();
  }
  return `Cliente #${props.recibo.clienteId}`;
});

const customerDocument = computed<string>(() => {
  if (!props.customer) return '—';
  const tipo = props.customer.tipoDocumento || props.customer.documentType || '';
  const num = props.customer.numeroDocumento || props.customer.documentNumber || '';
  if (tipo && num) return `${tipo}-${num}`;
  if (num) return num;
  return '—';
});

const customerAddress = computed<string>(() => {
  return props.customer?.direccion || props.customer?.address || '—';
});

const customerPhone = computed<string>(() => {
  return props.customer?.telefono || props.customer?.phone || '—';
});

const bankAccountLabel = computed<string>(() => {
  if (!props.recibo.cuentaBancariaId) return '';
  const cuenta = cuentaBancariaStore.getCuentaById(String(props.recibo.cuentaBancariaId));
  if (!cuenta) return '';
  const banco = bancoStore.getBancoById(String(cuenta.bancoId));
  return banco?.nombre ?? cuenta.descripcion ?? '';
});

// Equivalencias monetarias
const totalInBs = computed<number>(() => {
  if (isBolivares(currencyCode.value)) {
    return props.recibo.montoTotal;
  }
  return props.recibo.montoTotal * (props.recibo.tasaCambio || 1);
});

const totalInUsd = computed<number>(() => {
  if (!isBolivares(currencyCode.value)) {
    return props.recibo.montoTotal;
  }
  const tasa = props.recibo.tasaCambio || 1;
  return tasa > 0 ? props.recibo.montoTotal / tasa : props.recibo.montoTotal;
});
</script>

<template>
  <Teleport to="body">
    <div class="recibo-print-overlay fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 px-4 py-8">
      <div class="mx-auto max-w-3xl">

        <!-- Screen Action Bar -->
        <div class="print:hidden mb-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-md border border-gray-200">
          <div class="flex items-center gap-2">
            <span class="text-xl">🧾</span>
            <span class="text-sm font-bold text-gray-800">
              Vista Previa de Impresión — {{ isCruce ? 'Comprobante de Cruce' : 'Recibo de Cobro' }} #{{ props.recibo.numeroRecibo }}
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
              class="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800"
              @click="handlePrint"
            >
              <span>🖨️</span> <span>Imprimir Recibo</span>
            </button>
          </div>
        </div>

        <!-- Printable Document Sheet -->
        <div class="recibo-print-sheet rounded-xl bg-white p-8 shadow-2xl border border-gray-100 font-sans text-gray-800 text-xs leading-relaxed">

          <!-- 1. Encabezado de Empresa y Título -->
          <header class="mb-6 flex items-start justify-between border-b-2 border-gray-800 pb-4">
            <div class="max-w-[60%]">
              <h1 class="text-base font-black uppercase tracking-tight text-gray-950">
                {{ props.company?.nombre || 'ERP BUSINESS' }}
              </h1>
              <p v-if="props.company?.rif" class="font-bold text-gray-700 text-[11px]">
                RIF: {{ props.company.rif }}
              </p>
              <p v-if="props.company?.sucursalNombre" class="text-[11px] font-semibold text-emerald-800">
                Sucursal: {{ props.company.sucursalNombre }}
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
                :class="isCruce ? 'bg-indigo-50 text-indigo-900 border-indigo-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'"
              >
                {{ isCruce ? 'COMPROBANTE DE CRUCE' : 'RECIBO DE COBRO' }}
              </span>
              <h2 class="mt-1 text-base font-mono font-black text-gray-900">
                #{{ props.recibo.numeroRecibo }}
              </h2>
              <p class="text-[11px] font-semibold text-gray-600 mt-1">
                Fecha: {{ (props.recibo.fechaPago || '').slice(0, 10) }}
              </p>
              <p v-if="(props.recibo.fechaPago || '').length > 10" class="text-[10px] text-gray-400">
                Hora: {{ (props.recibo.fechaPago || '').slice(11, 19) }}
              </p>
            </div>
          </header>

          <!-- 2. Datos del Cliente y Condiciones de Pago -->
          <section class="mb-5 grid grid-cols-12 gap-4 rounded-lg bg-gray-50 p-3.5 border border-gray-200">
            <!-- Datos del Cliente -->
            <div class="col-span-7 border-r border-gray-200 pr-3 space-y-1">
              <p class="text-[10px] font-black uppercase tracking-wider text-gray-500">Datos del Cliente</p>
              <p class="text-sm font-bold text-gray-900">{{ customerDisplayName }}</p>
              <p class="text-[11px] text-gray-700 font-mono">
                <span class="font-semibold text-gray-500">Doc/RIF:</span> {{ customerDocument }}
              </p>
              <p v-if="customerPhone !== '—'" class="text-[11px] text-gray-600">
                <span class="font-semibold text-gray-500">Teléfono:</span> {{ customerPhone }}
              </p>
              <p v-if="customerAddress !== '—'" class="text-[10px] text-gray-500 line-clamp-2">
                <span class="font-semibold text-gray-500">Dirección:</span> {{ customerAddress }}
              </p>
            </div>

            <!-- Detalles de la Transacción -->
            <div class="col-span-5 pl-2 space-y-1 text-right">
              <p class="text-[10px] font-black uppercase tracking-wider text-gray-500">Detalles del Pago</p>
              <p class="text-xs font-bold text-gray-900">
                <span class="font-medium text-gray-500">Forma:</span> {{ props.recibo.formaPago }}
              </p>
              <p class="text-xs font-mono text-gray-800">
                <span class="font-medium text-gray-500">Moneda:</span> {{ currencyCode }}
              </p>
              <p v-if="props.recibo.tasaCambio && props.recibo.tasaCambio > 1" class="text-[11px] font-mono text-gray-600">
                <span class="font-medium text-gray-500">Tasa:</span> {{ Number(props.recibo.tasaCambio).toFixed(2) }} Bs./$
              </p>
              <p v-if="bankAccountLabel" class="text-[11px] text-gray-600">
                <span class="font-medium text-gray-500">Banco:</span> {{ bankAccountLabel }}
              </p>
            </div>
          </section>

          <!-- 3. Tabla de Documentos / CxC Aplicadas -->
          <section class="mb-5">
            <h3 class="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-700">
              Documentos Amortizados / Aplicados
            </h3>
            <table class="w-full text-left text-xs border border-gray-200">
              <thead>
                <tr class="bg-gray-100 font-bold uppercase text-[10px] text-gray-700 border-b border-gray-200">
                  <th class="py-2 px-3">Documento #</th>
                  <th class="py-2 px-3">Tipo</th>
                  <th class="py-2 px-3 text-right">Monto Original</th>
                  <th class="py-2 px-3 text-right">Monto Aplicado</th>
                  <th class="py-2 px-3 text-right">Saldo Restante</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <template v-if="props.recibo.detalles && props.recibo.detalles.length > 0">
                  <tr v-for="(det, idx) in props.recibo.detalles" :key="idx" class="hover:bg-gray-50">
                    <td class="py-2 px-3 font-mono font-bold text-gray-800">
                      {{ det.cxcNumero ? `#${det.cxcNumero}` : `CxC #${det.cxcId}` }}
                    </td>
                    <td class="py-2 px-3 font-medium text-gray-600">
                      {{ det.cxcTipo || 'FACTURA' }}
                    </td>
                    <td class="py-2 px-3 text-right font-mono text-gray-600">
                      {{ det.cxcMontoOriginal != null ? formatMoney(det.cxcMontoOriginal, currencyCode) : '—' }}
                    </td>
                    <td class="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                      {{ formatMoney(det.montoAplicado, currencyCode) }}
                    </td>
                    <td class="py-2 px-3 text-right font-mono text-gray-600">
                      {{ det.cxcSaldoPendiente != null ? formatMoney(det.cxcSaldoPendiente, currencyCode) : '—' }}
                    </td>
                  </tr>
                </template>
                <tr v-else>
                  <td colspan="5" class="py-3 px-3 text-center text-gray-400 italic">
                    Aplicación directa a cuenta por cobrar (sin desglose detallado de ítems).
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- 4. Resumen de Totales y Observaciones -->
          <section class="mb-6 grid grid-cols-12 gap-4">
            <!-- Observaciones -->
            <div class="col-span-7 rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              <p class="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Concepto / Observaciones</p>
              <p class="text-xs text-gray-700 italic leading-relaxed">
                {{ props.recibo.observaciones || 'Cancelación o abono a cuenta por cobrar registrado en el sistema.' }}
              </p>
            </div>

            <!-- Cuadro de Liquidación -->
            <div class="col-span-5 rounded-lg border border-gray-300 bg-gray-50 p-3 space-y-1.5 text-xs">
              <div class="flex justify-between text-gray-600">
                <span>Subtotal Aplicado:</span>
                <span class="font-mono font-bold">{{ formatMoney(props.recibo.montoTotal, currencyCode) }}</span>
              </div>

              <div v-if="props.recibo.aplicaIgtf && props.recibo.igtfMonto > 0" class="flex justify-between text-amber-900 font-medium">
                <span>IGTF ({{ props.recibo.igtfPorcentaje }}%):</span>
                <span class="font-mono font-bold">+{{ formatMoney(props.recibo.igtfMonto, currencyCode) }}</span>
              </div>

              <div class="my-1 border-t-2 border-gray-800 pt-1.5 flex justify-between items-baseline">
                <span class="font-black text-sm uppercase text-gray-900">Total Recibido:</span>
                <span class="font-mono font-black text-base text-emerald-950">
                  {{ formatMoney(props.recibo.montoTotal + (props.recibo.igtfMonto || 0), currencyCode) }}
                </span>
              </div>

              <!-- Conversión de Referencia Bs / USD -->
              <div class="pt-1 border-t border-dashed border-gray-300 text-[10px] text-gray-500 space-y-0.5 text-right font-mono">
                <p>Equiv. en Bolívares: <strong class="text-gray-800 font-bold">Bs. {{ totalInBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></p>
                <p>Equiv. en Dólares: <strong class="text-gray-800 font-bold">$ {{ totalInUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></p>
              </div>
            </div>
          </section>

          <!-- 5. Firmas de Conformidad -->
          <footer class="pt-10 border-t border-gray-200">
            <div class="grid grid-cols-2 gap-12 text-center text-xs text-gray-700">
              <div>
                <div class="border-t border-gray-800 pt-1.5 font-bold uppercase tracking-wider text-[11px]">
                  Entregado por / Cliente
                </div>
                <p class="text-[10px] text-gray-500 mt-0.5">{{ customerDisplayName }}</p>
                <p class="text-[10px] text-gray-400">Firma y Cédula</p>
              </div>

              <div>
                <div class="border-t border-gray-800 pt-1.5 font-bold uppercase tracking-wider text-[11px]">
                  Recibido Conforme / Caja
                </div>
                <p class="text-[10px] text-gray-500 mt-0.5">{{ props.company?.nombre || 'Administración' }}</p>
                <p class="text-[10px] text-gray-400">Firma y Sello Oficial</p>
              </div>
            </div>

            <div class="mt-8 text-center text-[9px] text-gray-400">
              Comprobante administrativo emitido por ERP Business · Sistema Integral de Gestión Empresarial
            </div>
          </footer>

        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@media print {
  .recibo-print-overlay {
    position: static !important;
    background: transparent !important;
    padding: 0 !important;
    overflow: visible !important;
    inset: auto !important;
  }

  .recibo-print-sheet {
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    max-width: 100% !important;
  }
}
</style>
