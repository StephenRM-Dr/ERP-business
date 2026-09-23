import { defineStore } from 'pinia';
import { ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { StockAdjustmentResult, StockItem, StockMovement } from './stock.interface';
import {
  toStockAdjustmentResult,
  toStockItem,
  toStockMovement,
  type StockDto,
  type StockMovimientoDto,
} from './stock.mapper';

export const useStockStore = defineStore('stock', () => {
  const stockList = ref<StockItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const movements = ref<StockMovement[]>([]);
  const isLoadingMovements = ref(false);

  function getStockItem(productId: string, warehouseId: string): StockItem | undefined {
    return stockList.value.find(
      (item) => item.productId === productId && item.warehouseId === warehouseId,
    );
  }

  async function fetchStock(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<StockDto[]>('/stock');
      stockList.value = data.map(toStockItem);
    } catch {
      error.value = 'inventory.control.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Persists a quantity for a product/warehouse pair. Updates the existing
   * stock row if one exists, or creates it via POST /stock otherwise (the
   * first time a product gets stocked at a given warehouse).
   *
   * Returns the AJ adjustment document (number, reason, before/after) when
   * the backend actually recorded a change, so the caller can print it —
   * null for a brand-new stock row (nothing to adjust yet, first stocking)
   * or when the quantity didn't actually change.
   */
  async function setQuantity(
    productId: string,
    warehouseId: string,
    quantity: number,
    reason?: string,
  ): Promise<StockAdjustmentResult | null> {
    const stockItem = getStockItem(productId, warehouseId);

    if (!stockItem) {
      const { data } = await apiClient.post<StockDto>('/stock', {
        producto_id: Number(productId),
        almacen_id: Number(warehouseId),
        cantidad: quantity,
      });
      stockList.value.push(toStockItem(data));
      return null;
    }

    const { data } = await apiClient.patch<StockDto>(`/stock/${stockItem.id}`, {
      cantidad: quantity,
      motivo: reason,
    });
    Object.assign(stockItem, toStockItem(data));
    return toStockAdjustmentResult(data);
  }

  async function fetchMovements(stockId: string): Promise<void> {
    isLoadingMovements.value = true;
    try {
      const { data } = await apiClient.get<StockMovimientoDto[]>(`/stock/${stockId}/movimientos`);
      movements.value = data.map(toStockMovement);
    } finally {
      isLoadingMovements.value = false;
    }
  }

  return {
    stockList,
    isLoading,
    error,
    movements,
    isLoadingMovements,
    getStockItem,
    fetchStock,
    setQuantity,
    fetchMovements,
  };
});
