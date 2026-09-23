import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Vendedor, VendedorFormData } from './vendedor.interface';
import { toVendedor, toVendedorDtoInput, type VendedorDto } from './vendedor.mapper';

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
  return 'master.vendedores.form.saveError';
}

export const useVendedorStore = defineStore('vendedor', () => {
  const vendedorList = ref<Vendedor[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const deleteError = ref<string | null>(null);

  const sortedVendedores = computed<Vendedor[]>(() =>
    [...vendedorList.value].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  function getVendedorById(id: string): Vendedor | undefined {
    return vendedorList.value.find((vendedor) => vendedor.id === id);
  }

  async function fetchVendedores(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<VendedorDto[]>('/vendedores');
      vendedorList.value = data.map(toVendedor);
    } catch {
      error.value = 'master.vendedores.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addVendedor(data: VendedorFormData): Promise<Vendedor> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<VendedorDto>(
        '/vendedores',
        toVendedorDtoInput(data),
      );
      const vendedor = toVendedor(created);
      vendedorList.value.push(vendedor);
      return vendedor;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateVendedor(id: string, data: VendedorFormData): Promise<void> {
    const existing = getVendedorById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<VendedorDto>(
        `/vendedores/${id}`,
        toVendedorDtoInput(data),
      );
      Object.assign(existing, toVendedor(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteVendedor(id: string): Promise<void> {
    deleteError.value = null;
    try {
      await apiClient.delete(`/vendedores/${id}`);
      vendedorList.value = vendedorList.value.filter((vendedor) => vendedor.id !== id);
    } catch (err) {
      deleteError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    vendedorList,
    sortedVendedores,
    isLoading,
    error,
    isSaving,
    saveError,
    deleteError,
    fetchVendedores,
    getVendedorById,
    addVendedor,
    updateVendedor,
    deleteVendedor,
  };
});
