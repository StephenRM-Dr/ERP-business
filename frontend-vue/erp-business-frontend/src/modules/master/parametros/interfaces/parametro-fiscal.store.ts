import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { ParametroFiscal, ParametroFiscalFormData } from './parametro-fiscal.interface';
import {
  toParametroFiscal,
  toParametroFiscalDtoInput,
  type ParametroFiscalDto,
} from './parametro-fiscal.mapper';

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
  return 'master.parametros.form.saveError';
}

export const useParametroFiscalStore = defineStore('parametroFiscal', () => {
  const parametroList = ref<ParametroFiscal[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const deleteError = ref<string | null>(null);

  const sortedParametros = computed<ParametroFiscal[]>(() =>
    [...parametroList.value].sort((a, b) => a.codigo.localeCompare(b.codigo)),
  );

  function getParametroById(id: string): ParametroFiscal | undefined {
    return parametroList.value.find((parametro) => parametro.id === id);
  }

  async function fetchParametros(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<ParametroFiscalDto[]>('/parametros-fiscales');
      parametroList.value = data.map(toParametroFiscal);
    } catch {
      error.value = 'master.parametros.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addParametro(data: ParametroFiscalFormData): Promise<ParametroFiscal> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<ParametroFiscalDto>(
        '/parametros-fiscales',
        toParametroFiscalDtoInput(data),
      );
      const parametro = toParametroFiscal(created);
      parametroList.value.push(parametro);
      return parametro;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateParametro(id: string, data: ParametroFiscalFormData): Promise<void> {
    const existing = getParametroById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<ParametroFiscalDto>(
        `/parametros-fiscales/${id}`,
        toParametroFiscalDtoInput(data),
      );
      Object.assign(existing, toParametroFiscal(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteParametro(id: string): Promise<void> {
    deleteError.value = null;
    try {
      await apiClient.delete(`/parametros-fiscales/${id}`);
      parametroList.value = parametroList.value.filter((parametro) => parametro.id !== id);
    } catch (err) {
      deleteError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    parametroList,
    sortedParametros,
    isLoading,
    error,
    isSaving,
    saveError,
    deleteError,
    fetchParametros,
    getParametroById,
    addParametro,
    updateParametro,
    deleteParametro,
  };
});
