import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { StockTransfer, StockTransferFormData, StockTransferItem } from './transfer.interface';
import { toStockTransfer, toTransferenciaDtoInput, type TransferenciaDto } from './transfer.mapper';
import { useStockStore } from './stock.store';

export const useTransferStore = defineStore('transfer', () => {
  const stockStore = useStockStore();

  const transferList = ref<StockTransfer[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);

  function resolveActionErrorMessage(err: unknown): string {
    if (axios.isAxiosError(err)) {
      const message = (err.response?.data as { message?: string | string[] } | undefined)
        ?.message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message) && message.length > 0) {
        return message.join(', ');
      }
    }
    return 'inventory.transfers.actionError';
  }

  const sortedTransfers = computed<StockTransfer[]>(() =>
    [...transferList.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  function getTransferById(id: string): StockTransfer | undefined {
    return transferList.value.find((transfer) => transfer.id === id);
  }

  async function fetchTransfers(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<TransferenciaDto[]>('/transferencias');
      transferList.value = data.map(toStockTransfer);
    } catch {
      error.value = 'inventory.transfers.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addTransfer(data: StockTransferFormData): Promise<StockTransfer> {
    const { data: created } = await apiClient.post<TransferenciaDto>(
      '/transferencias',
      toTransferenciaDtoInput(data),
    );
    const transfer = toStockTransfer(created);
    transferList.value.push(transfer);
    return transfer;
  }

  async function dispatchTransfer(id: string): Promise<void> {
    const transfer = getTransferById(id);
    if (transfer?.status !== 'REQUESTED') {
      return;
    }

    actionError.value = null;

    try {
      const { data } = await apiClient.patch<TransferenciaDto>(`/transferencias/${id}/despachar`);
      Object.assign(transfer, toStockTransfer(data));
    } catch (err) {
      actionError.value = resolveActionErrorMessage(err);
      throw err;
    }
  }

  /** Confirms what arrived, applying any per-line discrepancy the receiver reports. */
  async function receiveTransfer(
    id: string,
    receivedItems: Pick<StockTransferItem, 'productId' | 'receivedQuantity'>[],
    receptionNotes?: string,
  ): Promise<void> {
    const transfer = getTransferById(id);
    if (!transfer || (transfer.status !== 'REQUESTED' && transfer.status !== 'IN_TRANSIT')) {
      return;
    }

    actionError.value = null;

    try {
      const { data } = await apiClient.patch<TransferenciaDto>(`/transferencias/${id}/recibir`, {
        items: receivedItems
          .filter((item) => item.receivedQuantity !== undefined)
          .map((item) => ({
            producto_id: Number(item.productId),
            cantidad_recibida: item.receivedQuantity,
          })),
      });
      Object.assign(transfer, toStockTransfer(data));
      transfer.receptionNotes = receptionNotes;
      // recibir() moves stock server-side; refresh the shared stock list.
      await stockStore.fetchStock();
    } catch (err) {
      actionError.value = resolveActionErrorMessage(err);
      throw err;
    }
  }

  /**
   * Transfers are the inventory's audit trail (backend table
   * `inventario_movimientos`), so pending ones are cancelled rather than
   * hard-deleted — a real delete would destroy the movement history that
   * traceability depends on. This is the "eliminar" action for transfers.
   */
  async function cancelTransfer(id: string): Promise<void> {
    const transfer = getTransferById(id);
    if (!transfer || (transfer.status !== 'REQUESTED' && transfer.status !== 'IN_TRANSIT')) {
      return;
    }

    actionError.value = null;

    try {
      const { data } = await apiClient.patch<TransferenciaDto>(`/transferencias/${id}/cancelar`);
      Object.assign(transfer, toStockTransfer(data));
    } catch (err) {
      actionError.value = resolveActionErrorMessage(err);
      throw err;
    }
  }

  return {
    transferList,
    sortedTransfers,
    isLoading,
    error,
    actionError,
    getTransferById,
    fetchTransfers,
    addTransfer,
    dispatchTransfer,
    receiveTransfer,
    cancelTransfer,
  };
});
