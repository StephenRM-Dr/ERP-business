import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Empresa, EmpresaFormData } from './empresa.interface';
import { toEmpresa, toEmpresaDtoInput, type EmpresaDto } from './empresa.mapper';

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
  return 'master.empresas.form.saveError';
}

export const useEmpresaStore = defineStore('empresa', () => {
  const empresaList = ref<Empresa[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);

  const sortedEmpresas = computed<Empresa[]>(() =>
    [...empresaList.value].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  function getEmpresaById(id: string): Empresa | undefined {
    return empresaList.value.find((empresa) => empresa.id === id);
  }

  async function fetchEmpresas(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<EmpresaDto[]>('/empresas');
      empresaList.value = data.map(toEmpresa);
    } catch {
      error.value = 'master.empresas.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addEmpresa(data: EmpresaFormData): Promise<Empresa> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<EmpresaDto>(
        '/empresas',
        toEmpresaDtoInput(data),
      );
      const empresa = toEmpresa(created);
      empresaList.value.push(empresa);
      return empresa;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateEmpresa(id: string, data: EmpresaFormData): Promise<void> {
    const existing = getEmpresaById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<EmpresaDto>(
        `/empresas/${existing.id}`,
        toEmpresaDtoInput(data),
      );
      Object.assign(existing, toEmpresa(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteEmpresa(id: string): Promise<void> {
    const existing = getEmpresaById(id);
    if (!existing) {
      return;
    }

    await apiClient.delete(`/empresas/${existing.id}`);
    empresaList.value = empresaList.value.filter((empresa) => empresa.id !== id);
  }

  return {
    empresaList,
    sortedEmpresas,
    isLoading,
    error,
    isSaving,
    saveError,
    fetchEmpresas,
    getEmpresaById,
    addEmpresa,
    updateEmpresa,
    deleteEmpresa,
  };
});
