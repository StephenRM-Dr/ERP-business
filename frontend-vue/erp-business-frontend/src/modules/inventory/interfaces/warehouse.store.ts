import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Warehouse, WarehouseFormData } from './warehouse.interface';
import { toAlmacenDtoInput, toWarehouse, type AlmacenDto } from './warehouse.mapper';

function resolveSaveErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string | string[] } | undefined)?.message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }
  }
  return 'inventory.warehouses.form.saveError';
}

export const useWarehouseStore = defineStore('warehouse', () => {
  const warehouseList = ref<Warehouse[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const deleteError = ref<string | null>(null);

  const sortedWarehouses = computed<Warehouse[]>(() =>
    [...warehouseList.value].sort((a, b) => a.name.localeCompare(b.name)),
  );

  function getWarehouseById(id: string): Warehouse | undefined {
    return warehouseList.value.find((warehouse) => warehouse.id === id);
  }

  /** sucursalId scopes the result to one branch — omit to fetch every warehouse (used by the Maestros admin list). */
  async function fetchWarehouses(sucursalId?: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<AlmacenDto[]>('/almacenes', {
        params: sucursalId ? { sucursal_id: sucursalId } : undefined,
      });
      warehouseList.value = data.map(toWarehouse);
    } catch {
      error.value = 'inventory.warehouses.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addWarehouse(data: WarehouseFormData): Promise<Warehouse> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<AlmacenDto>(
        '/almacenes',
        toAlmacenDtoInput(data),
      );
      const warehouse = toWarehouse(created);
      warehouseList.value.push(warehouse);
      return warehouse;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateWarehouse(id: string, data: WarehouseFormData): Promise<void> {
    const existing = getWarehouseById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<AlmacenDto>(
        `/almacenes/${id}`,
        toAlmacenDtoInput(data),
      );
      Object.assign(existing, toWarehouse(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteWarehouse(id: string): Promise<void> {
    const existing = getWarehouseById(id);
    if (!existing) {
      return;
    }

    deleteError.value = null;
    try {
      await apiClient.delete(`/almacenes/${id}`);
      warehouseList.value = warehouseList.value.filter((warehouse) => warehouse.id !== id);
    } catch (err) {
      deleteError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    warehouseList,
    sortedWarehouses,
    isLoading,
    error,
    isSaving,
    saveError,
    deleteError,
    getWarehouseById,
    fetchWarehouses,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
  };
});
