<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import { formatMoney } from '@/utils/money';
import { useCompanyInfo } from '@/composables/useCompanyInfo';
import { useInvoicesStore } from '@/modules/invoices/invoices.store';
import ReturnPrintPreview from '../components/ReturnPrintPreview.vue';
import { useReturnsStore } from '../returns.store';
import type { InvoiceReturn } from '../interfaces/return.interface';

const { t } = useI18n();
const returnsStore = useReturnsStore();
const { ensureLoaded: ensureCompanyLoaded, companyFor } = useCompanyInfo();
const invoicesStore = useInvoicesStore();

onMounted(() => {
  ensureCompanyLoaded();
  if (!invoicesStore.isLoaded) {
    invoicesStore.fetchInvoices();
  }
});

// La nota de crédito hereda el membrete de la factura que devuelve.
const companyInfo = computed(() =>
  companyFor(
    invoicesStore.invoices.find((invoice) => invoice.id === returnToPrint.value?.invoiceId)
      ?.sucursalId ?? null,
  ),
);

const searchTerm = ref<string>('');
const statusFilter = ref<'ALL' | InvoiceReturn['status']>('ALL');

const returnToVoid = ref<InvoiceReturn | null>(null);
const voidReason = ref<string>('');

// Set by the per-row "Reprint" button, for any return regardless of status.
const returnToPrint = ref<InvoiceReturn | null>(null);

const filteredReturns = computed<InvoiceReturn[]>(() =>
  returnsStore.sortedReturns.filter((invoiceReturn) => {
    const matchesStatus =
      statusFilter.value === 'ALL' || invoiceReturn.status === statusFilter.value;
    const term = searchTerm.value.trim().toLowerCase();
    const matchesTerm =
      term === '' ||
      invoiceReturn.number.toLowerCase().includes(term) ||
      invoiceReturn.invoiceNumber.toLowerCase().includes(term);

    return matchesStatus && matchesTerm;
  }),
);

const pagination = usePagination(filteredReturns);

watch([searchTerm, statusFilter], () => pagination.resetPage());

function confirmVoid(): void {
  if (returnToVoid.value && voidReason.value.trim() !== '') {
    returnsStore.voidReturn(returnToVoid.value.id, voidReason.value);
    returnToVoid.value = null;
    voidReason.value = '';
  }
}

function cancelVoid(): void {
  returnToVoid.value = null;
  voidReason.value = '';
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('returns.listTitle') }}</h1>
      <RouterLink
        to="/returns/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('returns.new') }}
      </RouterLink>
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <SearchInput id="returns-search" v-model="searchTerm" :placeholder="t('returns.listSearchPlaceholder')" />

      <div class="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
        <button
          v-for="status in (['ALL', 'ACTIVE', 'VOIDED'] as const)"
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
          {{ t(`returns.statusFilter.${status.toLowerCase()}`) }}
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('returns.number') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('invoices.list.number') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('invoices.list.date') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('returns.refundTotal') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('invoices.list.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="invoiceReturn in pagination.pageItems.value"
              :key="invoiceReturn.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono font-semibold text-gray-800">
                {{ invoiceReturn.number }}
              </td>
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ invoiceReturn.invoiceNumber }}</td>
              <td class="px-5 py-3.5 text-gray-500">{{ invoiceReturn.date }}</td>
              <td class="px-5 py-3.5 text-right font-semibold text-gray-800">
                {{ formatMoney(invoiceReturn.refundTotal, invoiceReturn.currencyCode) }}
              </td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="t(`returns.status.${invoiceReturn.status.toLowerCase()}`)"
                  :tone="invoiceReturn.status === 'ACTIVE' ? 'success' : 'danger'"
                  :title="invoiceReturn.voidReason ?? undefined"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                    @click="returnToPrint = invoiceReturn"
                  >
                    {{ t('invoices.print.printButton') }}
                  </button>
                  <button
                    v-if="invoiceReturn.status === 'ACTIVE'"
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="returnToVoid = invoiceReturn"
                  >
                    {{ t('invoices.actions.void') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="6" class="px-5 py-10 text-center text-sm font-semibold text-amber-700 bg-amber-50/30">
                ⚠️ No hay registros disponibles para esta sucursal.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        :page="pagination.page.value"
        :total-pages="pagination.totalPages.value"
        :total-items="pagination.totalItems.value"
        :range-start="pagination.rangeStart.value"
        :range-end="pagination.rangeEnd.value"
        :page-size="pagination.pageSize.value"
        @update:page="pagination.page.value = $event"
        @update:pageSize="pagination.pageSize.value = $event"
      />
    </div>

    <!-- Void return confirmation with mandatory reason -->
    <ConfirmDialog
      :open="returnToVoid !== null"
      :title="t('returns.voidDialog.title')"
      :message="
        t('returns.voidDialog.message', {
          number: returnToVoid?.number ?? '',
          invoice: returnToVoid?.invoiceNumber ?? '',
        })
      "
      :confirm-label="t('invoices.actions.void')"
      destructive
      @confirm="confirmVoid"
      @cancel="cancelVoid"
    >
      <div class="mt-4">
        <label for="return-void-reason" class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('invoices.voidDialog.reason') }}
        </label>
        <textarea
          id="return-void-reason"
          v-model="voidReason"
          rows="2"
          :placeholder="t('invoices.voidDialog.reasonPlaceholder')"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        />
        <p v-if="voidReason.trim() === ''" class="mt-1 text-xs text-amber-600">
          {{ t('invoices.voidDialog.reasonRequired') }}
        </p>
      </div>
    </ConfirmDialog>

    <ReturnPrintPreview
      v-if="returnToPrint"
      :invoice-return="returnToPrint"
      :company="companyInfo"
      @close="returnToPrint = null"
    />
  </div>
</template>
