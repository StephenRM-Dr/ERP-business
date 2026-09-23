import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { CreatePagoPayload, CuentaPagarPendiente, PagoProveedor } from './interfaces/pago-proveedor.interface';
import {
  toCreatePagoDtoInput,
  toCuentaPagarPendiente,
  toPagoProveedor,
  type CuentaPagarPendienteDto,
  type PagoProveedorDto,
} from './interfaces/pago-proveedor.mapper';

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
  return 'pagosProveedores.form.saveError';
}

export const usePagosProveedoresStore = defineStore('pagosProveedores', () => {
  const pagoList = ref<PagoProveedor[]>([]);
  const cuentasPendientes = ref<CuentaPagarPendiente[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isLoadingCuentas = ref(false);
  const cuentasError = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);

  const sortedPagos = computed<PagoProveedor[]>(() =>
    [...pagoList.value].sort((a, b) => b.fechaPago.localeCompare(a.fechaPago)),
  );

  async function fetchPagos(proveedorId?: number, sucursalId?: number): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<PagoProveedorDto[]>('/pagos-proveedores', {
        params: { proveedor_id: proveedorId, sucursal_id: sucursalId },
      });
      pagoList.value = data.map(toPagoProveedor);
    } catch {
      error.value = 'pagosProveedores.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  /** Cuentas por pagar abiertas de un proveedor — reusa GET /cuentas-pagar. */
  async function fetchCuentasPendientes(proveedorId: number): Promise<void> {
    isLoadingCuentas.value = true;
    cuentasError.value = null;
    try {
      const { data } = await apiClient.get<CuentaPagarPendienteDto[]>('/cuentas-pagar', {
        params: { proveedor_id: proveedorId, status: 'PENDIENTE' },
      });
      cuentasPendientes.value = data.map(toCuentaPagarPendiente);
    } catch {
      cuentasError.value = 'pagosProveedores.cuentasFetchError';
    } finally {
      isLoadingCuentas.value = false;
    }
  }

  async function registerPago(payload: CreatePagoPayload): Promise<PagoProveedor> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<PagoProveedorDto>(
        '/pagos-proveedores',
        toCreatePagoDtoInput(payload),
      );
      const pago = toPagoProveedor(created);
      pagoList.value.push(pago);
      return pago;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  return {
    pagoList,
    sortedPagos,
    cuentasPendientes,
    isLoading,
    error,
    isLoadingCuentas,
    cuentasError,
    isSaving,
    saveError,
    fetchPagos,
    fetchCuentasPendientes,
    registerPago,
  };
});
