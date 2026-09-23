import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Serial, SerialFormData } from './serial.interface';
import { toSerial, toSerialDtoInput, type SerialDto } from './serial.mapper';

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
  return 'inventory.seriales.form.saveError';
}

export const useSerialStore = defineStore('serial', () => {
  const serialList = ref<Serial[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const deleteError = ref<string | null>(null);

  const sortedSeriales = computed<Serial[]>(() =>
    [...serialList.value].sort((a, b) => a.numeroSerial.localeCompare(b.numeroSerial)),
  );

  function getSerialById(id: string): Serial | undefined {
    return serialList.value.find((serial) => serial.id === id);
  }

  async function fetchSeriales(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<SerialDto[]>('/seriales');
      serialList.value = data.map(toSerial);
    } catch {
      error.value = 'inventory.seriales.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addSerial(data: SerialFormData): Promise<Serial> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<SerialDto>('/seriales', toSerialDtoInput(data));
      const serial = toSerial(created);
      serialList.value.push(serial);
      return serial;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateSerial(id: string, data: SerialFormData): Promise<void> {
    const existing = getSerialById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<SerialDto>(
        `/seriales/${id}`,
        toSerialDtoInput(data),
      );
      Object.assign(existing, toSerial(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteSerial(id: string): Promise<void> {
    deleteError.value = null;
    try {
      await apiClient.delete(`/seriales/${id}`);
      serialList.value = serialList.value.filter((serial) => serial.id !== id);
    } catch (err) {
      deleteError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    serialList,
    sortedSeriales,
    isLoading,
    error,
    isSaving,
    saveError,
    deleteError,
    fetchSeriales,
    getSerialById,
    addSerial,
    updateSerial,
    deleteSerial,
  };
});
