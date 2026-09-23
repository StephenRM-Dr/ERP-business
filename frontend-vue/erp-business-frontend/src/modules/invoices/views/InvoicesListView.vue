<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useCustomerStore } from '@/modules/customers/interfaces/customer.store';
import { useProductStore } from '@/modules/inventory/interfaces/product.store';
import { useCompanyInfo } from '@/composables/useCompanyInfo';
import { useEmpresaStore } from '@/modules/master/empresas/interfaces/empresa.store';
import { useSucursalStore } from '@/modules/master/sucursales/interfaces/sucursal.store';
import { formatMoney } from '@/utils/money';
import InvoicePrintPreview from '../components/InvoicePrintPreview.vue';
import { useInvoicesStore } from '../invoices.store';
import type { Invoice } from '../interfaces/invoice.interface';

const { t } = useI18n();
const authStore = useAuthStore();
const invoicesStore = useInvoicesStore();
const { ensureLoaded: ensureCompanyLoaded, companyFor } = useCompanyInfo();
const empresaStore = useEmpresaStore();
const sucursalStore = useSucursalStore();
const customerStore = useCustomerStore();
const currenciesStore = useCurrenciesStore();
const productStore = useProductStore();

// A user without this permission is always pinned to their own sucursal —
// the empresa/sucursal filters below are hidden and the backend ignores any
// value they'd try to send anyway (enforced server-side, not just hidden here).
const canViewAllLocations = computed<boolean>(
  () => authStore.user?.rolId === 1 || authStore.hasPermission('general.viewAllLocations'),
);

onMounted(async () => {
  ensureCompanyLoaded();
  if (sucursalStore.sucursalList.length === 0) {
    sucursalStore.fetchSucursales();
  }
  // Customer/currency/product names are resolved client-side when mapping
  // GET /facturas, so they must be loaded before fetchInvoicesPage() runs.
  await Promise.all([
    customerStore.customerList.length === 0 ? customerStore.fetchCustomers() : Promise.resolve(),
    currenciesStore.currencies.length === 0 ? currenciesStore.fetchCurrencies() : Promise.resolve(),
    productStore.productList.length === 0 ? productStore.fetchProducts() : Promise.resolve(),
  ]);
  await loadPage();
});

// El membrete sale de la empresa dueña de la sucursal que emitió la factura,
// no de la primera empresa cargada.
const companyInfo = computed(() => companyFor(invoiceToPrint.value?.sucursalId ?? null));

const searchTerm = ref<string>('');
const statusFilter = ref<'ALL' | Invoice['status']>('ALL');
const empresaFilter = ref<number | ''>('');
const sucursalFilter = ref<number | ''>('');
const condicionPagoFilter = ref<'ALL' | 'CONTADO' | 'CREDITO'>('ALL');

// Sucursal options narrow to the selected empresa, same convention as
// elsewhere in the app (e.g. SucursalForm's empresa->sucursal relationship).
const sucursalOptions = computed(() =>
  sucursalStore.sortedSucursales.filter(
    (sucursal) => empresaFilter.value === '' || sucursal.empresaId === empresaFilter.value,
  ),
);

const page = ref<number>(1);
const pageSize = ref<number>(10);

async function loadPage(): Promise<void> {
  await invoicesStore.fetchInvoicesPage({
    sucursalId: canViewAllLocations.value ? (sucursalFilter.value || undefined) : undefined,
    empresaId: canViewAllLocations.value ? (empresaFilter.value || undefined) : undefined,
    condicionPago: condicionPagoFilter.value === 'ALL' ? undefined : condicionPagoFilter.value,
    search: searchTerm.value,
    page: page.value,
    pageSize: pageSize.value,
  });
}

function resetToFirstPage(): void {
  page.value = 1;
  loadPage();
}

// Debounced so typing a search term doesn't fire a request per keystroke.
let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(searchTerm, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(resetToFirstPage, 300);
});

watch([empresaFilter, sucursalFilter, condicionPagoFilter], resetToFirstPage);
watch(empresaFilter, () => {
  // Clear a now-invalid sucursal selection when its empresa changes.
  if (sucursalFilter.value !== '' && !sucursalOptions.value.some((s) => Number(s.id) === sucursalFilter.value)) {
    sucursalFilter.value = '';
  }
});
watch(page, loadPage);
watch(pageSize, resetToFirstPage);

const totalPages = computed<number>(() =>
  Math.max(1, Math.ceil(invoicesStore.pagedTotal / pageSize.value)),
);
const rangeStart = computed<number>(() =>
  invoicesStore.pagedTotal === 0 ? 0 : (page.value - 1) * pageSize.value + 1,
);
const rangeEnd = computed<number>(() =>
  Math.min(page.value * pageSize.value, invoicesStore.pagedTotal),
);

// Status (ISSUED/PARTIALLY_RETURNED/RETURNED/VOIDED) is derived client-side
// from the returns store, not a real backend column, so it can only filter
// the page already loaded — not the full result set across all pages.
const filteredInvoices = computed<Invoice[]>(() =>
  invoicesStore.pagedInvoices.filter(
    (invoice) => statusFilter.value === 'ALL' || invoice.status === statusFilter.value,
  ),
);

// Pending action state for the voiding confirmation dialog.
const invoiceToVoid = ref<Invoice | null>(null);
const voidReason = ref<string>('');
const voidError = ref<string>('');
const isVoiding = ref<boolean>(false);

// Set once a void succeeds, to show the printable void document.
const voidedInvoice = ref<Invoice | null>(null);

// Set by the per-row "Reprint" button, for any invoice regardless of status.
const invoiceToPrint = ref<Invoice | null>(null);

// Voiding is a same-day correction; older invoices must go through a return.
const today = new Date().toISOString().slice(0, 10);

function canVoid(invoice: Invoice): boolean {
  return invoice.status === 'ISSUED' && invoice.issuedAt === today;
}

function canReturn(invoice: Invoice): boolean {
  return invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_RETURNED';
}

function sucursalName(invoice: Invoice): string {
  return sucursalStore.getSucursalById(String(invoice.sucursalId))?.nombre ?? '—';
}

const statusStyles: Record<Invoice['status'], string> = {
  ISSUED: 'bg-emerald-50 text-emerald-700',
  PARTIALLY_RETURNED: 'bg-sky-50 text-sky-700',
  RETURNED: 'bg-amber-50 text-amber-700',
  VOIDED: 'bg-red-50 text-red-600',
};

async function confirmVoid(): Promise<void> {
  if (!invoiceToVoid.value || voidReason.value.trim() === '') {
    return;
  }

  voidError.value = '';
  isVoiding.value = true;
  const invoice = invoiceToVoid.value;

  try {
    await invoicesStore.voidInvoice(invoice.id, voidReason.value);
    invoiceToVoid.value = null;
    voidReason.value = '';
    // voidInvoice mutates invoicesStore.invoices (the unpaginated list used
    // by other flows), not pagedInvoices — reload this page to reflect it.
    await loadPage();
    voidedInvoice.value = invoicesStore.pagedInvoices.find((item) => item.id === invoice.id) ?? null;
  } catch {
    voidError.value = t('invoices.voidDialog.error');
  } finally {
    isVoiding.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('invoices.listTitle') }}</h1>
      <RouterLink
        to="/invoices/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('invoices.newSale') }}
      </RouterLink>
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <SearchInput id="invoice-search" v-model="searchTerm" :placeholder="t('invoices.list.searchPlaceholder')" />

      <div class="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
        <button
          v-for="status in (['ALL', 'ISSUED', 'PARTIALLY_RETURNED', 'RETURNED', 'VOIDED'] as const)"
          :key="status"
          type="button"
          :class="[
            'rounded-md px-3 py-1.5 text-xs font-medium transition',
            statusFilter === status
              ? 'bg-navy text-white'
              : 'text-gray-500 hover:bg-gray-100',
          ]"
          @click="statusFilter = status"
        >
          {{ t(`invoices.statusFilter.${status.toLowerCase()}`) }}
        </button>
      </div>

      <select
        v-model="condicionPagoFilter"
        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
      >
        <option value="ALL">{{ t('invoices.list.allPaymentConditions') }}</option>
        <option value="CONTADO">{{ t('invoices.print.cash') }}</option>
        <option value="CREDITO">{{ t('invoices.print.credit') }}</option>
      </select>

      <template v-if="canViewAllLocations">
        <select
          v-model="empresaFilter"
          class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        >
          <option value="">{{ t('invoices.list.allEmpresas') }}</option>
          <option v-for="empresa in empresaStore.sortedEmpresas" :key="empresa.id" :value="Number(empresa.id)">
            {{ empresa.nombre }}
          </option>
        </select>

        <select
          v-model="sucursalFilter"
          class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        >
          <option value="">{{ t('invoices.list.allSucursales') }}</option>
          <option v-for="sucursal in sucursalOptions" :key="sucursal.id" :value="Number(sucursal.id)">
            {{ sucursal.nombre }}
          </option>
        </select>
      </template>
    </div>

    <!-- Invoice table -->
    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('invoices.list.number') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('invoices.list.customer') }}</th>
              <th v-if="canViewAllLocations" class="px-5 py-3.5 font-medium">{{ t('inventory.control.warehouse') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('invoices.list.date') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('invoices.totals.total') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('invoices.list.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>

          <tbody>
            <p v-if="invoicesStore.isLoadingPage" class="sr-only">{{ t('invoices.list.loading') }}</p>
            <tr
              v-for="invoice in filteredInvoices"
              :key="invoice.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono font-semibold text-gray-800">
                {{ invoice.number }}
              </td>
              <td class="px-5 py-3.5 text-gray-700">{{ invoice.customerName }}</td>
              <td v-if="canViewAllLocations" class="px-5 py-3.5 text-gray-500">{{ sucursalName(invoice) }}</td>
              <td class="px-5 py-3.5 text-gray-500">{{ invoice.issuedAt }}</td>
              <td class="px-5 py-3.5 text-right font-semibold text-gray-800">
                {{ formatMoney(invoice.total, invoice.currencyCode) }}
              </td>
              <td class="px-5 py-3.5">
                <span
                  :class="['rounded-full px-2.5 py-1 text-xs font-semibold', statusStyles[invoice.status]]"
                  :title="invoice.voidReason ?? undefined"
                >
                  {{ t(`invoices.status.${invoice.status.toLowerCase()}`) }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                    @click="invoiceToPrint = invoice"
                  >
                    {{ t('invoices.print.printButton') }}
                  </button>
                  <RouterLink
                    v-if="canReturn(invoice)"
                    :to="{ path: '/returns/create', query: { invoice: invoice.id } }"
                    class="rounded-md px-2 py-1 text-xs font-medium text-amber-600 transition hover:bg-amber-50"
                  >
                    {{ t('invoices.actions.return') }}
                  </RouterLink>
                  <button
                    v-if="canVoid(invoice)"
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="invoiceToVoid = invoice"
                  >
                    {{ t('invoices.actions.void') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!invoicesStore.isLoadingPage && filteredInvoices.length === 0">
              <td :colspan="canViewAllLocations ? 7 : 6" class="px-5 py-10 text-center text-sm font-semibold text-amber-700 bg-amber-50/30">
                ⚠️ No hay registros disponibles para esta sucursal.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        :page="page"
        :total-pages="totalPages"
        :total-items="invoicesStore.pagedTotal"
        :range-start="rangeStart"
        :range-end="rangeEnd"
        :page-size="pageSize"
        @update:page="page = $event"
        @update:pageSize="pageSize = $event"
      />
    </div>

    <!-- Void confirmation with mandatory reason -->
    <ConfirmDialog
      :open="invoiceToVoid !== null"
      :title="t('invoices.voidDialog.title')"
      :message="t('invoices.voidDialog.message', { number: invoiceToVoid?.number ?? '' })"
      :confirm-label="t('invoices.actions.void')"
      :confirm-disabled="isVoiding"
      destructive
      @confirm="confirmVoid"
      @cancel="((invoiceToVoid = null), (voidReason = ''), (voidError = ''))"
    >
      <div class="mt-4">
        <label for="void-reason" class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('invoices.voidDialog.reason') }}
        </label>
        <textarea
          id="void-reason"
          v-model="voidReason"
          rows="2"
          :placeholder="t('invoices.voidDialog.reasonPlaceholder')"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        />
        <p v-if="voidReason.trim() === ''" class="mt-1 text-xs text-amber-600">
          {{ t('invoices.voidDialog.reasonRequired') }}
        </p>
        <p v-if="voidError" class="mt-1 text-xs text-red-600">{{ voidError }}</p>
      </div>
    </ConfirmDialog>

    <InvoicePrintPreview
      v-if="voidedInvoice"
      :invoice="voidedInvoice"
      :company="companyInfo"
      @close="voidedInvoice = null"
    />

    <InvoicePrintPreview
      v-if="invoiceToPrint"
      :invoice="invoiceToPrint"
      :company="companyInfo"
      @close="invoiceToPrint = null"
    />
  </div>
</template>
