<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useInvoicesStore } from '../invoices.store';
import type { Invoice } from '../interfaces/invoice.interface';
import { formatMoney } from '@/utils/money';

interface Props {
  show: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'reprint', invoice: Invoice): void;
}>();

const invoicesStore = useInvoicesStore();
const searchTerm = ref<string>('');
const isLoading = ref<boolean>(false);
const invoices = ref<Invoice[]>([]);
const page = ref<number>(1);
const pageSize = ref<number>(8);

async function fetchInvoices(): Promise<void> {
  isLoading.value = true;
  try {
    await invoicesStore.fetchInvoicesPage({
      search: searchTerm.value.trim() || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    invoices.value = invoicesStore.pagedInvoices;
  } catch (err) {
    console.error('Error cargando facturas para reimpresión:', err);
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      searchTerm.value = '';
      page.value = 1;
      fetchInvoices();
    }
  },
);

let searchTimeout: ReturnType<typeof setTimeout> | undefined;
function onSearchChange(): void {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    fetchInvoices();
  }, 300);
}

function handleReprint(invoice: Invoice): void {
  emit('reprint', invoice);
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-sky-50 to-white">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-xl shadow-xs">
            🖨️
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-800">Reimpresión de Facturas y Documentos</h3>
            <p class="text-xs text-gray-500">Seleccione la factura que desea reimprimir con formato oficial</p>
          </div>
        </div>
        <button
          type="button"
          class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          @click="emit('close')"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Search bar -->
      <div class="p-4 bg-gray-50 border-b border-gray-200">
        <div class="relative">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Buscar por número de factura o nombre del cliente..."
            class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm shadow-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            @input="onSearchChange"
          />
          <svg
            class="absolute left-3.5 top-3 h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <!-- Invoices list -->
      <div class="flex-1 overflow-y-auto p-4 min-h-[300px]">
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-16 text-gray-400">
          <div class="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p class="text-sm font-medium">Buscando facturas...</p>
        </div>

        <div v-else-if="invoices.length === 0" class="text-center py-16 text-gray-500">
          <span class="text-4xl block mb-2">📄</span>
          <p class="text-sm font-semibold">No se encontraron facturas</p>
          <p class="text-xs text-gray-400 mt-1">Intente con otro término de búsqueda</p>
        </div>

        <table v-else class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50/70 text-xs font-semibold uppercase tracking-wider text-gray-600">
              <th class="px-4 py-2.5">Factura #</th>
              <th class="px-4 py-2.5">Fecha</th>
              <th class="px-4 py-2.5">Cliente</th>
              <th class="px-4 py-2.5">Condición</th>
              <th class="px-4 py-2.5 text-right">Total ($)</th>
              <th class="px-4 py-2.5 text-center">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="inv in invoices"
              :key="inv.id"
              class="hover:bg-sky-50/40 transition duration-150"
            >
              <td class="px-4 py-3 font-mono font-bold text-sky-700">
                {{ inv.number || ('#' + inv.id) }}
              </td>
              <td class="px-4 py-3 text-xs text-gray-600">
                {{ inv.issuedAt }}
              </td>
              <td class="px-4 py-3">
                <p class="font-medium text-gray-800">{{ inv.customerName || 'Cliente General' }}</p>
                <p class="text-[11px] text-gray-400 font-mono">{{ inv.customerDocument }}</p>
              </td>
              <td class="px-4 py-3 text-xs">
                <span
                  :class="[
                    'inline-block px-2 py-0.5 rounded-full font-semibold text-[11px]',
                    inv.paymentCondition === 'CASH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  ]"
                >
                  {{ inv.paymentCondition === 'CASH' ? 'CONTADO' : 'CRÉDITO' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-mono font-semibold text-gray-800">
                ${{ formatMoney(inv.total, 'USD') }}
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition active:scale-95 cursor-pointer"
                  @click="handleReprint(inv)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Reimprimir
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button
          type="button"
          class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition cursor-pointer"
          @click="emit('close')"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>
