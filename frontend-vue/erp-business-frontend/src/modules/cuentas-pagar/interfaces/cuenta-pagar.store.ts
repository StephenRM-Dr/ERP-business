import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { CuentaPagar, CuentaPagarUpdateData } from './cuenta-pagar.interface';
import {
  toCuentaPagar,
  toCuentaPagarUpdateDtoInput,
  type CuentaPagarDto,
} from './cuenta-pagar.mapper';

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
  return 'cuentasPagar.form.saveError';
}

export const useCuentaPagarStore = defineStore('cuentaPagar', () => {
  const cuentaList = ref<CuentaPagar[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);

  const sortedCuentas = computed<CuentaPagar[]>(() =>
    [...cuentaList.value].sort(
      (a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime(),
    ),
  );

  function getCuentaById(id: string): CuentaPagar | undefined {
    return cuentaList.value.find((cuenta) => cuenta.id === id);
  }

  /** `proveedorId`/`status` map straight to GET /cuentas-pagar's query params. */
  async function fetchCuentasPagar(proveedorId?: number, status?: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<CuentaPagarDto[]>('/cuentas-pagar', {
        params: {
          proveedor_id: proveedorId,
          status,
        },
      });
      cuentaList.value = data.map(toCuentaPagar);
    } catch {
      error.value = 'cuentasPagar.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function updateCuenta(id: string, data: CuentaPagarUpdateData): Promise<void> {
    const existing = getCuentaById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<CuentaPagarDto>(
        `/cuentas-pagar/${id}`,
        toCuentaPagarUpdateDtoInput(data),
      );
      Object.assign(existing, toCuentaPagar(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  return {
    cuentaList,
    sortedCuentas,
    isLoading,
    error,
    isSaving,
    saveError,
    fetchCuentasPagar,
    getCuentaById,
    updateCuenta,
  };
});
