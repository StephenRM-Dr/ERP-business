import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Lote, LoteFormData } from './lote.interface';
import { toLote, toLoteDtoInput, type LoteDto } from './lote.mapper';

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
  return 'inventory.lotes.form.saveError';
}

export const useLoteStore = defineStore('lote', () => {
  const loteList = ref<Lote[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const deleteError = ref<string | null>(null);

  const sortedLotes = computed<Lote[]>(() =>
    [...loteList.value].sort((a, b) => a.numeroLote.localeCompare(b.numeroLote)),
  );

  function getLoteById(id: string): Lote | undefined {
    return loteList.value.find((lote) => lote.id === id);
  }

  async function fetchLotes(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<LoteDto[]>('/lotes');
      loteList.value = data.map(toLote);
    } catch {
      error.value = 'inventory.lotes.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addLote(data: LoteFormData): Promise<Lote> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<LoteDto>('/lotes', toLoteDtoInput(data));
      const lote = toLote(created);
      loteList.value.push(lote);
      return lote;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateLote(id: string, data: LoteFormData): Promise<void> {
    const existing = getLoteById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<LoteDto>(`/lotes/${id}`, toLoteDtoInput(data));
      Object.assign(existing, toLote(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteLote(id: string): Promise<void> {
    deleteError.value = null;
    try {
      await apiClient.delete(`/lotes/${id}`);
      loteList.value = loteList.value.filter((lote) => lote.id !== id);
    } catch (err) {
      deleteError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    loteList,
    sortedLotes,
    isLoading,
    error,
    isSaving,
    saveError,
    deleteError,
    fetchLotes,
    getLoteById,
    addLote,
    updateLote,
    deleteLote,
  };
});
