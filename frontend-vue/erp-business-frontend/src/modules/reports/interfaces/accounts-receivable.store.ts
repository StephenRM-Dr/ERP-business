import { defineStore } from 'pinia';
import { ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { AccountsReceivableEntry } from './accounts-receivable.interface';

/** Raw shape returned by GET /cuentas-cobrar (backend/src/cuentas-cobrar). */
interface CuentaCobrarDto {
  id: number;
  cliente_id: number;
  tipo_documento: string;
  numero_documento: string;
  factura_id: number | null;
  fecha_emision: string;
  fecha_vencimiento: string;
  monto_original: string | number;
  saldo_pendiente: string | number;
  moneda_id: number;
  tasa_cambio: string | number;
  status: string;
}

function toEntry(dto: CuentaCobrarDto): AccountsReceivableEntry {
  return {
    id: String(dto.id),
    clienteId: String(dto.cliente_id),
    tipoDocumento: dto.tipo_documento,
    numeroDocumento: dto.numero_documento,
    facturaId: dto.factura_id,
    fechaEmision: dto.fecha_emision,
    fechaVencimiento: dto.fecha_vencimiento,
    montoOriginal: Number(dto.monto_original),
    saldoPendiente: Number(dto.saldo_pendiente),
    monedaId: dto.moneda_id,
    tasaCambio: Number(dto.tasa_cambio),
    status: dto.status,
  };
}

export const useAccountsReceivableStore = defineStore('accountsReceivable', () => {
  const entries = ref<AccountsReceivableEntry[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchEntries(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<CuentaCobrarDto[]>('/cuentas-cobrar');
      entries.value = data.map(toEntry);
    } catch {
      error.value = 'reports.accountsReceivable.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  return {
    entries,
    isLoading,
    error,
    fetchEntries,
  };
});
