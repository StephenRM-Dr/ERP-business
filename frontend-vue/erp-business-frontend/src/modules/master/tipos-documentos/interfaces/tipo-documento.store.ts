import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { TipoDocumento, TipoDocumentoFormData } from './tipo-documento.interface';
import { toTipoDocumento, toTipoDocumentoDtoInput, type TipoDocumentoDto } from './tipo-documento.mapper';

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
  return 'master.tiposDocumentos.form.saveError';
}

export const useTipoDocumentoStore = defineStore('tipoDocumento', () => {
  const tipoDocumentoList = ref<TipoDocumento[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const deleteError = ref<string | null>(null);

  const sortedTiposDocumentos = computed<TipoDocumento[]>(() =>
    [...tipoDocumentoList.value].sort(
      (a, b) => a.sucursalId - b.sucursalId || a.codigo.localeCompare(b.codigo),
    ),
  );

  function getTipoDocumentoById(id: string): TipoDocumento | undefined {
    return tipoDocumentoList.value.find((tipo) => tipo.id === id);
  }

  async function fetchTiposDocumentos(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<TipoDocumentoDto[]>('/tipos-documentos');
      tipoDocumentoList.value = data.map(toTipoDocumento);
    } catch {
      error.value = 'master.tiposDocumentos.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addTipoDocumento(data: TipoDocumentoFormData): Promise<TipoDocumento> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<TipoDocumentoDto>(
        '/tipos-documentos',
        toTipoDocumentoDtoInput(data),
      );
      const tipo = toTipoDocumento(created);
      tipoDocumentoList.value.push(tipo);
      return tipo;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateTipoDocumento(id: string, data: TipoDocumentoFormData): Promise<void> {
    const existing = getTipoDocumentoById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<TipoDocumentoDto>(
        `/tipos-documentos/${id}`,
        toTipoDocumentoDtoInput(data),
      );
      Object.assign(existing, toTipoDocumento(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteTipoDocumento(id: string): Promise<void> {
    deleteError.value = null;
    try {
      await apiClient.delete(`/tipos-documentos/${id}`);
      tipoDocumentoList.value = tipoDocumentoList.value.filter((tipo) => tipo.id !== id);
    } catch (err) {
      deleteError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    tipoDocumentoList,
    sortedTiposDocumentos,
    isLoading,
    error,
    isSaving,
    saveError,
    deleteError,
    fetchTiposDocumentos,
    getTipoDocumentoById,
    addTipoDocumento,
    updateTipoDocumento,
    deleteTipoDocumento,
  };
});
