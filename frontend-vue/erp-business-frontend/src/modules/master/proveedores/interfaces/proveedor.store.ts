import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Proveedor, ProveedorFormData } from './proveedor.interface';
import { toProveedor, toProveedorDtoInput, type ProveedorDto } from './proveedor.mapper';

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
  return 'master.proveedores.form.saveError';
}

export const useProveedorStore = defineStore('proveedor', () => {
  const proveedorList = ref<Proveedor[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const deleteError = ref<string | null>(null);

  const sortedProveedores = computed<Proveedor[]>(() =>
    [...proveedorList.value].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  function getProveedorById(id: string): Proveedor | undefined {
    return proveedorList.value.find((proveedor) => proveedor.id === id);
  }

  async function fetchProveedores(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<ProveedorDto[]>('/proveedores');
      proveedorList.value = data.map(toProveedor);
    } catch {
      error.value = 'master.proveedores.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addProveedor(data: ProveedorFormData): Promise<Proveedor> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<ProveedorDto>(
        '/proveedores',
        toProveedorDtoInput(data),
      );
      const proveedor = toProveedor(created);
      proveedorList.value.push(proveedor);
      return proveedor;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateProveedor(id: string, data: ProveedorFormData): Promise<void> {
    const existing = getProveedorById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<ProveedorDto>(
        `/proveedores/${id}`,
        toProveedorDtoInput(data),
      );
      Object.assign(existing, toProveedor(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteProveedor(id: string): Promise<void> {
    deleteError.value = null;
    try {
      await apiClient.delete(`/proveedores/${id}`);
      proveedorList.value = proveedorList.value.filter((proveedor) => proveedor.id !== id);
    } catch (err) {
      deleteError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    proveedorList,
    sortedProveedores,
    isLoading,
    error,
    isSaving,
    saveError,
    deleteError,
    fetchProveedores,
    getProveedorById,
    addProveedor,
    updateProveedor,
    deleteProveedor,
  };
});
