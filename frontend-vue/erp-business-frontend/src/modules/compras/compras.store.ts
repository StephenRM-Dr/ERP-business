import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Compra, CreateCompraPayload } from './interfaces/compra.interface';
import { toCompra, toCreateCompraDtoInput, type CompraDto } from './interfaces/compra.mapper';

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
  return 'compras.form.saveError';
}

export const useComprasStore = defineStore('compras', () => {
  const compraList = ref<Compra[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const anularError = ref<string | null>(null);

  const sortedCompras = computed<Compra[]>(() =>
    [...compraList.value].sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision)),
  );

  function getCompraById(id: string): Compra | undefined {
    return compraList.value.find((compra) => compra.id === id);
  }

  async function fetchCompras(proveedorId?: number, sucursalId?: number): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<CompraDto[]>('/compras', {
        params: { proveedor_id: proveedorId, sucursal_id: sucursalId },
      });
      compraList.value = data.map(toCompra);
    } catch {
      error.value = 'compras.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function registerCompra(payload: CreateCompraPayload): Promise<Compra> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<CompraDto>('/compras', toCreateCompraDtoInput(payload));
      const compra = toCompra(created);
      compraList.value.push(compra);
      return compra;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function anularCompra(id: string): Promise<void> {
    const existing = getCompraById(id);
    if (!existing) return;

    anularError.value = null;
    try {
      const { data: updated } = await apiClient.patch<CompraDto>(`/compras/${id}/anular`);
      Object.assign(existing, toCompra(updated));
    } catch (err) {
      anularError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    compraList,
    sortedCompras,
    isLoading,
    error,
    isSaving,
    saveError,
    anularError,
    fetchCompras,
    getCompraById,
    registerCompra,
    anularCompra,
  };
});
