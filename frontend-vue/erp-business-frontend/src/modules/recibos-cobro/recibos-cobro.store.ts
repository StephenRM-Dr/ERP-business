import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type {
  CreateReciboPayload,
  CuentaPendiente,
  ReciboCobro,
  ReciboCobroDetalle,
} from './interfaces/recibo-cobro.interface';
import {
  toCreateReciboDtoInput,
  toCuentaPendiente,
  toReciboCobro,
  toReciboCobroDetalle,
  type CuentaPendienteDto,
  type ReciboCobroDetalleDto,
  type ReciboCobroDto,
} from './interfaces/recibo-cobro.mapper';

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
  return 'recibosCobro.form.saveError';
}

export const useRecibosCobroStore = defineStore('recibosCobro', () => {
  const reciboList = ref<ReciboCobro[]>([]);
  const cuentasPendientes = ref<CuentaPendiente[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isLoadingCuentas = ref(false);
  const cuentasError = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);

  const sortedRecibos = computed<ReciboCobro[]>(() =>
    [...reciboList.value].sort((a, b) => b.fechaPago.localeCompare(a.fechaPago)),
  );

  async function fetchRecibos(clienteId?: number, sucursalId?: number): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<ReciboCobroDto[]>('/recibos-cobro', {
        params: { cliente_id: clienteId, sucursal_id: sucursalId },
      });
      reciboList.value = data.map(toReciboCobro);
    } catch {
      error.value = 'recibosCobro.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCuentasPendientes(clienteId: number): Promise<void> {
    isLoadingCuentas.value = true;
    cuentasError.value = null;
    try {
      const { data } = await apiClient.get<CuentaPendienteDto[]>(
        '/recibos-cobro/cuentas-pendientes',
        { params: { cliente_id: clienteId } },
      );
      cuentasPendientes.value = data.map(toCuentaPendiente);
    } catch {
      cuentasError.value = 'recibosCobro.cuentasFetchError';
    } finally {
      isLoadingCuentas.value = false;
    }
  }

  async function registerRecibo(payload: CreateReciboPayload): Promise<ReciboCobro> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<ReciboCobroDto>(
        '/recibos-cobro',
        toCreateReciboDtoInput(payload),
      );
      const recibo = toReciboCobro(created);
      reciboList.value.push(recibo);
      return recibo;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function fetchDetalles(reciboId: string): Promise<ReciboCobroDetalle[]> {
    const { data } = await apiClient.get<ReciboCobroDetalleDto[]>(
      `/recibos-cobro/${reciboId}/detalles`,
    );
    return data.map(toReciboCobroDetalle);
  }

  async function fetchReciboById(reciboId: string | number): Promise<ReciboCobro> {
    const { data } = await apiClient.get<ReciboCobroDto & { detalles?: ReciboCobroDetalleDto[] }>(
      `/recibos-cobro/${reciboId}`,
    );
    const recibo = toReciboCobro(data);
    if (!recibo.detalles || recibo.detalles.length === 0) {
      try {
        const detalles = await fetchDetalles(String(reciboId));
        recibo.detalles = detalles;
      } catch {
        // Si no hay detalles o falla el endpoint secundario, se conserva el recibo base
      }
    }
    return recibo;
  }

  return {
    reciboList,
    sortedRecibos,
    cuentasPendientes,
    isLoading,
    error,
    isLoadingCuentas,
    cuentasError,
    isSaving,
    saveError,
    fetchRecibos,
    fetchCuentasPendientes,
    registerRecibo,
    fetchDetalles,
    fetchReciboById,
  };
});
