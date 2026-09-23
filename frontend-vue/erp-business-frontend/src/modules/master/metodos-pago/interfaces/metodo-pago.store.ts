import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { MetodoPago, MetodoPagoFormData } from './metodo-pago.interface';
import { toMetodoPago, toMetodoPagoDtoInput, type MetodoPagoDto } from './metodo-pago.mapper';

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
  return 'master.metodosPago.form.saveError';
}

export const useMetodoPagoStore = defineStore('metodoPago', () => {
  const metodoList = ref<MetodoPago[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const deleteError = ref<string | null>(null);

  const sortedMetodos = computed<MetodoPago[]>(() =>
    [...metodoList.value].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  const activeMetodos = computed<MetodoPago[]>(() =>
    sortedMetodos.value.filter((metodo) => metodo.activo),
  );

  function getMetodoById(id: string): MetodoPago | undefined {
    return metodoList.value.find((metodo) => metodo.id === id);
  }

  async function fetchMetodos(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<MetodoPagoDto[]>('/metodos-pago');
      metodoList.value = data.map(toMetodoPago);
    } catch {
      error.value = 'master.metodosPago.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addMetodo(data: MetodoPagoFormData): Promise<MetodoPago> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<MetodoPagoDto>(
        '/metodos-pago',
        toMetodoPagoDtoInput(data),
      );
      const metodo = toMetodoPago(created);
      metodoList.value.push(metodo);
      return metodo;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateMetodo(id: string, data: MetodoPagoFormData): Promise<void> {
    const existing = getMetodoById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<MetodoPagoDto>(
        `/metodos-pago/${id}`,
        toMetodoPagoDtoInput(data),
      );
      Object.assign(existing, toMetodoPago(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteMetodo(id: string): Promise<void> {
    deleteError.value = null;
    try {
      await apiClient.delete(`/metodos-pago/${id}`);
      metodoList.value = metodoList.value.filter((metodo) => metodo.id !== id);
    } catch (err) {
      deleteError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    metodoList,
    sortedMetodos,
    activeMetodos,
    isLoading,
    error,
    isSaving,
    saveError,
    deleteError,
    fetchMetodos,
    getMetodoById,
    addMetodo,
    updateMetodo,
    deleteMetodo,
  };
});
