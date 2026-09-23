<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { usePagination } from '@/composables/usePagination';
import { useCompanyInfo } from '@/composables/useCompanyInfo';
import ReceiveTransferDialog from '../components/ReceiveTransferDialog.vue';
import TransferDetailDialog from '../components/TransferDetailDialog.vue';
import TransferPrintDocument from '../components/TransferPrintDocument.vue';
import type { StockTransfer, StockTransferStatus } from '../interfaces/transfer.interface';
import { useTransferStore } from '../interfaces/transfer.store';
import { useWarehouseStore } from '../interfaces/warehouse.store';

const { t } = useI18n();
const transferStore = useTransferStore();
const warehouseStore = useWarehouseStore();
const { ensureLoaded: ensureCompanyLoaded, companyFor } = useCompanyInfo();

const searchTerm = ref<string>('');
const transferToReceive = ref<StockTransfer | null>(null);
const transferToView = ref<StockTransfer | null>(null);
const transferToCancel = ref<StockTransfer | null>(null);
const isCanceling = ref<boolean>(false);
const transferToPrint = ref<StockTransfer | null>(null);

// Membrete de la empresa dueña del almacén de origen (o destino) del movimiento.
const companyInfo = computed(() => {
  const transfer = transferToPrint.value;
  const warehouseId = transfer?.fromWarehouseId ?? transfer?.toWarehouseId ?? null;
  return companyFor(
    warehouseId ? warehouseStore.getWarehouseById(warehouseId)?.sucursalId ?? null : null,
  );
});

const filteredTransfers = computed<StockTransfer[]>(() =>
  transferStore.sortedTransfers.filter((transfer) => {
    const term = searchTerm.value.trim().toLowerCase();
    return term === '' || transfer.code.toLowerCase().includes(term);
  }),
);

const pagination = usePagination(filteredTransfers, 10);

watch(searchTerm, () => pagination.resetPage());

onMounted(() => {
  if (warehouseStore.warehouseList.length === 0) {
    warehouseStore.fetchWarehouses();
  }
  ensureCompanyLoaded();
  transferStore.fetchTransfers();
});

function warehouseName(warehouseId: string | null): string {
  if (!warehouseId) {
    return '—';
  }
  return warehouseStore.getWarehouseById(warehouseId)?.name ?? '—';
}

const STATUS_STYLES: Record<StockTransferStatus, string> = {
  REQUESTED: 'bg-amber-50 text-amber-700',
  IN_TRANSIT: 'bg-blue-50 text-blue-700',
  RECEIVED_PARTIAL: 'bg-orange-50 text-orange-700',
  RECEIVED_CONFIRMED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function statusLabel(status: StockTransferStatus): string {
  return t(`inventory.transfers.status.${status}`);
}

function categoryLabel(transfer: StockTransfer): string {
  return t(`inventory.transfers.category.${transfer.category}`);
}

function dispatch(transfer: StockTransfer): void {
  transferStore.dispatchTransfer(transfer.id);
}

function openReceive(transfer: StockTransfer): void {
  transferToReceive.value = transfer;
}

function openView(transfer: StockTransfer): void {
  transferToView.value = transfer;
}

function closeView(): void {
  transferToView.value = null;
}

function confirmReceive(
  receivedItems: { productId: string; receivedQuantity: number }[],
  notes: string,
): void {
  if (transferToReceive.value) {
    transferStore.receiveTransfer(transferToReceive.value.id, receivedItems, notes);
    transferToReceive.value = null;
  }
}

function cancelReceive(): void {
  transferToReceive.value = null;
}

function cancel(transfer: StockTransfer): void {
  transferToCancel.value = transfer;
}

async function confirmCancel(): Promise<void> {
  if (transferToCancel.value) {
    isCanceling.value = true;
    try {
      await transferStore.cancelTransfer(transferToCancel.value.id);
      transferToCancel.value = null;
    } catch {
      // Keep the dialog open so the error message from the store is visible.
    } finally {
      isCanceling.value = false;
    }
  }
}

function cancelCancel(): void {
  transferToCancel.value = null;
  transferStore.actionError = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('inventory.transfers.title') }}</h1>
      <RouterLink
        to="/inventory/transfers/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('inventory.transfers.newTransfer') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="transfers-search" v-model="searchTerm" :placeholder="t('inventory.transfers.searchPlaceholder')" />
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.transfers.form.code') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.transfers.form.category') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('inventory.transfers.form.from') }} → {{ t('inventory.transfers.form.to') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('inventory.transfers.form.items') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="transfer in pagination.pageItems.value"
              :key="transfer.id"
              class="cursor-pointer border-t border-gray-100 hover:bg-gray-50/60 transition"
              @click="openView(transfer)"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ transfer.code }}</td>
              <td class="px-5 py-3.5 text-gray-600">{{ categoryLabel(transfer) }}</td>
              <td class="px-5 py-3.5 text-gray-600">
                {{ warehouseName(transfer.fromWarehouseId) }} → {{ warehouseName(transfer.toWarehouseId) }}
              </td>
              <td class="px-5 py-3.5 text-right text-gray-600">{{ transfer.items.length }}</td>
              <td class="px-5 py-3.5">
                <span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_STYLES[transfer.status]]">
                  {{ statusLabel(transfer.status) }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-right" @click.stop>
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                    @click="openView(transfer)"
                  >
                    {{ t('common.view') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                    @click="transferToPrint = transfer"
                  >
                    {{ t('invoices.print.printButton') }}
                  </button>
                  <template v-if="transfer.status === 'REQUESTED' || transfer.status === 'IN_TRANSIT'">
                    <!-- Only BRANCH_TRANSFER moves between two real locations and
                    needs an "in transit" step. Every other category (ingreso
                    nuevo, merma, muestras/exhibición, cuarentena) is receive-only:
                    it either enters or leaves stock directly, nothing to dispatch. -->
                    <button
                      v-if="transfer.status === 'REQUESTED' && transfer.category === 'BRANCH_TRANSFER'"
                      type="button"
                      class="rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                      @click="dispatch(transfer)"
                    >
                      {{ t('inventory.transfers.dispatch') }}
                    </button>
                    <button
                      type="button"
                      class="rounded-md px-2 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50"
                      @click="openReceive(transfer)"
                    >
                      {{ t('inventory.transfers.receive') }}
                    </button>
                    <button
                      type="button"
                      class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                      @click="cancel(transfer)"
                    >
                      {{ t('common.cancel') }}
                    </button>
                  </template>
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

    <ReceiveTransferDialog
      :transfer="transferToReceive"
      @confirm="confirmReceive"
      @cancel="cancelReceive"
    />

    <TransferDetailDialog :transfer="transferToView" @close="closeView" />

    <TransferPrintDocument
      v-if="transferToPrint"
      :transfer="transferToPrint"
      :company="companyInfo"
      @close="transferToPrint = null"
    />

    <ConfirmDialog
      :open="transferToCancel !== null"
      :title="t('inventory.transfers.cancelDialog.title')"
      :message="t('inventory.transfers.cancelDialog.message', { code: transferToCancel?.code ?? '' })"
      :confirm-label="t('common.cancel')"
      :confirm-disabled="isCanceling"
      destructive
      @confirm="confirmCancel"
      @cancel="cancelCancel"
    >
      <p v-if="transferStore.actionError" class="mt-3 text-sm text-red-600">
        {{ transferStore.actionError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
