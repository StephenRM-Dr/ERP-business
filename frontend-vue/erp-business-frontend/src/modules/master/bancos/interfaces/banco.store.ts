import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Banco, BancoFormData } from './banco.interface';
import { toBanco, toBancoDtoInput, type BancoDto } from './banco.mapper';

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
  return 'master.bancos.form.saveError';
}

export const useBancoStore = defineStore('banco', () => {
  const bancoList = ref<Banco[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const deleteError = ref<string | null>(null);

  const sortedBancos = computed<Banco[]>(() =>
    [...bancoList.value].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  function getBancoById(id: string): Banco | undefined {
    return bancoList.value.find((banco) => banco.id === id);
  }

  async function fetchBancos(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<BancoDto[]>('/bancos');
      bancoList.value = data.map(toBanco);
    } catch {
      error.value = 'master.bancos.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addBanco(data: BancoFormData): Promise<Banco> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<BancoDto>('/bancos', toBancoDtoInput(data));
      const banco = toBanco(created);
      bancoList.value.push(banco);
      return banco;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateBanco(id: string, data: BancoFormData): Promise<void> {
    const existing = getBancoById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<BancoDto>(
        `/bancos/${existing.codigo}`,
        toBancoDtoInput(data),
      );
      Object.assign(existing, toBanco(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteBanco(id: string): Promise<void> {
    const existing = getBancoById(id);
    if (!existing) {
      return;
    }

    deleteError.value = null;
    try {
      await apiClient.delete(`/bancos/${existing.codigo}`);
      bancoList.value = bancoList.value.filter((banco) => banco.id !== id);
    } catch (err) {
      deleteError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    bancoList,
    sortedBancos,
    isLoading,
    error,
    isSaving,
    saveError,
    deleteError,
    fetchBancos,
    getBancoById,
    addBanco,
    updateBanco,
    deleteBanco,
  };
});
