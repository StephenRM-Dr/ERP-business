import { defineStore } from 'pinia';
import { ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { SalesReportEntry } from './sales-report.interface';

/**
 * Raw shape returned by GET /facturas (backend/src/facturas), trimmed to the
 * fields the sales report needs. Kept separate from invoices.mapper.ts's
 * FacturaDto since that one models the cart-creation flow, not a full listing.
 */
interface FacturaReportDto {
  id: number;
  correlativo: string;
  cliente_id: number;
  moneda: number;
  subtotal: string | number;
  monto_iva: string | number;
  igtf: string | number;
  total: string | number;
  estado: string;
  fecha_emision: string;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  vendedor_id?: number | null;
  vendedor_nombre?: string | null;
  porcentaje_vendedor_1?: number | string;
  vendedor_secundario_id?: number | null;
  vendedor_secundario_nombre?: string | null;
  porcentaje_vendedor_2?: number | string;
}

function toEntry(dto: FacturaReportDto): SalesReportEntry {
  return {
    id: String(dto.id),
    numeroFactura: dto.correlativo,
    clienteId: String(dto.cliente_id),
    monedaId: dto.moneda,
    subtotal: Number(dto.subtotal),
    montoIva: Number(dto.monto_iva),
    igtf: Number(dto.igtf),
    total: Number(dto.total),
    estado: dto.estado,
    fechaEmision: dto.fecha_emision,
    usuarioId: dto.usuario_id ?? null,
    usuarioNombre: dto.usuario_nombre ?? null,
    vendedorId: dto.vendedor_id ?? null,
    vendedorNombre: dto.vendedor_nombre ?? null,
    porcentajeVendedor1: dto.porcentaje_vendedor_1 ? Number(dto.porcentaje_vendedor_1) : undefined,
    vendedorSecundarioId: dto.vendedor_secundario_id ?? null,
    vendedorSecundarioNombre: dto.vendedor_secundario_nombre ?? null,
    porcentajeVendedor2: dto.porcentaje_vendedor_2 ? Number(dto.porcentaje_vendedor_2) : undefined,
  };
}

export const useSalesReportStore = defineStore('salesReport', () => {
  const entries = ref<SalesReportEntry[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchEntries(filters?: { vendedorIds?: number[]; usuarioIds?: number[] }): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const params: Record<string, any> = { pageSize: 5000 };
      if (filters?.vendedorIds && filters.vendedorIds.length > 0) {
        params.vendedor_ids = filters.vendedorIds.join(',');
      }
      if (filters?.usuarioIds && filters.usuarioIds.length > 0) {
        params.usuario_ids = filters.usuarioIds.join(',');
      }
      const { data: page } = await apiClient.get<{ data: FacturaReportDto[]; total: number }>(
        '/facturas',
        { params },
      );
      entries.value = page.data.map(toEntry);
    } catch {
      error.value = 'reports.sales.fetchError';
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
