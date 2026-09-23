import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { CuentaBancaria, CuentaBancariaFormData } from './cuenta-bancaria.interface';
import {
  toCuentaBancaria,
  toCuentaBancariaDtoInput,
  type CuentaBancariaDto,
} from './cuenta-bancaria.mapper';

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
  return 'master.cuentasBancarias.form.saveError';
}

export const useCuentaBancariaStore = defineStore('cuentaBancaria', () => {
  const cuentaList = ref<CuentaBancaria[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);

  const sortedCuentas = computed<CuentaBancaria[]>(() =>
    [...cuentaList.value].sort((a, b) => a.numeroCuenta.localeCompare(b.numeroCuenta)),
  );

  function getCuentaById(id: string): CuentaBancaria | undefined {
    return cuentaList.value.find((cuenta) => cuenta.id === id);
  }

  async function fetchCuentas(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<CuentaBancariaDto[]>('/cuentas-bancarias');
      cuentaList.value = data.map(toCuentaBancaria);
    } catch {
      error.value = 'master.cuentasBancarias.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addCuenta(data: CuentaBancariaFormData): Promise<CuentaBancaria> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<CuentaBancariaDto>(
        '/cuentas-bancarias',
        toCuentaBancariaDtoInput(data),
      );
      const cuenta = toCuentaBancaria(created);
      cuentaList.value.push(cuenta);
      return cuenta;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateCuenta(id: string, data: CuentaBancariaFormData): Promise<void> {
    const existing = getCuentaById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<CuentaBancariaDto>(
        `/cuentas-bancarias/${existing.numeroCuenta}`,
        toCuentaBancariaDtoInput(data),
      );
      Object.assign(existing, toCuentaBancaria(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteCuenta(id: string): Promise<void> {
    const existing = getCuentaById(id);
    if (!existing) {
      return;
    }

    await apiClient.delete(`/cuentas-bancarias/${existing.numeroCuenta}`);
    cuentaList.value = cuentaList.value.filter((cuenta) => cuenta.id !== id);
  }

  return {
    cuentaList,
    sortedCuentas,
    isLoading,
    error,
    isSaving,
    saveError,
    fetchCuentas,
    getCuentaById,
    addCuenta,
    updateCuenta,
    deleteCuenta,
  };
});
