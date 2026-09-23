import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Sucursal, SucursalFormData } from './sucursal.interface';
import { toSucursal, toSucursalDtoInput, type SucursalDto } from './sucursal.mapper';

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
  return 'master.sucursales.form.saveError';
}

export const useSucursalStore = defineStore('sucursal', () => {
  const sucursalList = ref<Sucursal[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);

  const sortedSucursales = computed<Sucursal[]>(() =>
    [...sucursalList.value].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  function getSucursalById(id: string): Sucursal | undefined {
    return sucursalList.value.find((sucursal) => sucursal.id === id);
  }

  async function fetchSucursales(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<SucursalDto[]>('/sucursales');
      sucursalList.value = data.map(toSucursal);
    } catch {
      error.value = 'master.sucursales.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addSucursal(data: SucursalFormData): Promise<Sucursal> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<SucursalDto>(
        '/sucursales',
        toSucursalDtoInput(data),
      );
      const sucursal = toSucursal(created);
      sucursalList.value.push(sucursal);
      return sucursal;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateSucursal(id: string, data: SucursalFormData): Promise<void> {
    const existing = getSucursalById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<SucursalDto>(
        `/sucursales/${existing.codigo}`,
        toSucursalDtoInput(data),
      );
      Object.assign(existing, toSucursal(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteSucursal(id: string): Promise<void> {
    const existing = getSucursalById(id);
    if (!existing) {
      return;
    }

    await apiClient.delete(`/sucursales/${existing.codigo}`);
    sucursalList.value = sucursalList.value.filter((sucursal) => sucursal.id !== id);
  }

  return {
    sucursalList,
    sortedSucursales,
    isLoading,
    error,
    isSaving,
    saveError,
    fetchSucursales,
    getSucursalById,
    addSucursal,
    updateSucursal,
    deleteSucursal,
  };
});
