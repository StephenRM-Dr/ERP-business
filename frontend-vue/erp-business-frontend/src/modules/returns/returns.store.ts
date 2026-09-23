import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import { useInvoicesStore } from '@/modules/invoices/invoices.store';
import type { CreateReturnPayload, InvoiceReturn } from './interfaces/return.interface';

/** Raw shape returned by POST /devoluciones (backend/src/devoluciones). */
interface DevolucionDto {
  id: number;
  numero_devolucion: string;
  motivo: string;
}

export const useReturnsStore = defineStore('returns', () => {
  // Replaced by GET /returns once the backend exposes it.
  const returns = ref<InvoiceReturn[]>([]);

  const sortedReturns = computed<InvoiceReturn[]>(() =>
    [...returns.value].sort((a, b) => b.number.localeCompare(a.number)),
  );

  /**
   * Units effectively returned per invoice, keyed by product. Voided returns
   * do not count: their quantities become returnable again. The creation
   * view uses this to cap partial returns at what is still returnable.
   */
  const returnedQuantities = computed<Record<string, Record<string, number>>>(() => {
    const byInvoice: Record<string, Record<string, number>> = {};

    for (const invoiceReturn of returns.value) {
      if (invoiceReturn.status !== 'ACTIVE') {
        continue;
      }

      const byProduct = (byInvoice[invoiceReturn.invoiceId] ??= {});

      for (const item of invoiceReturn.items) {
        byProduct[item.productId] = (byProduct[item.productId] ?? 0) + item.quantity;
      }
    }

    return byInvoice;
  });

  function getReturnedQuantity(invoiceId: string, productId: string): number {
    return returnedQuantities.value[invoiceId]?.[productId] ?? 0;
  }

  /**
   * How much of the invoice is effectively returned, counting only active
   * returns: NONE (nothing), PARTIAL (some units) or FULL (every unit).
   */
  function computeReturnLevel(invoiceId: string): 'NONE' | 'PARTIAL' | 'FULL' {
    const invoicesStore = useInvoicesStore();
    const invoice = invoicesStore.invoices.find((item) => item.id === invoiceId);

    if (!invoice) {
      return 'NONE';
    }

    const returnedUnits = invoice.details.reduce(
      (sum, detail) => sum + getReturnedQuantity(invoiceId, detail.productId),
      0,
    );

    if (returnedUnits === 0) {
      return 'NONE';
    }

    const isFull = invoice.details.every(
      (detail) => getReturnedQuantity(invoiceId, detail.productId) >= detail.quantity,
    );

    return isFull ? 'FULL' : 'PARTIAL';
  }

  /**
   * Registers the return via POST /devoluciones — persists it, credits stock
   * server-side once processed, and returns the backend's own numero/id —
   * then mirrors it into the local list so the returns UI keeps working.
   */
  async function registerReturn(
    payload: CreateReturnPayload,
    customerName: string,
    customerDocument: string,
  ): Promise<InvoiceReturn> {
    const { data } = await apiClient.post<DevolucionDto>('/devoluciones', {
      factura_id: Number(payload.invoiceId),
      motivo: payload.reason.trim(),
      items: payload.items.map((item) => ({
        producto_id: Number(item.productId),
        cantidad_devuelta: item.quantity,
        factura_item_id: item.facturaItemId,
      })),
    });

    const invoiceReturn: InvoiceReturn = {
      ...payload,
      items: payload.items.map((item) => ({ ...item })),
      id: String(data.id),
      number: data.numero_devolucion,
      date: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
      voidReason: null,
      customerName,
      customerDocument,
    };

    returns.value.push(invoiceReturn);
    useInvoicesStore().applyReturnStatus(payload.invoiceId, computeReturnLevel(payload.invoiceId));

    return invoiceReturn;
  }

  /**
   * Voids a return registered by mistake (human error correction). Its
   * quantities become returnable again and the invoice status reverts
   * accordingly (possibly back to ISSUED). A reason is mandatory.
   */
  function voidReturn(returnId: string, reason: string): void {
    const invoiceReturn = returns.value.find((item) => item.id === returnId);

    if (invoiceReturn?.status !== 'ACTIVE' || reason.trim() === '') {
      return;
    }

    invoiceReturn.status = 'VOIDED';
    invoiceReturn.voidReason = reason.trim();

    useInvoicesStore().applyReturnStatus(
      invoiceReturn.invoiceId,
      computeReturnLevel(invoiceReturn.invoiceId),
    );
  }

  return {
    returns,
    sortedReturns,
    getReturnedQuantity,
    registerReturn,
    voidReturn,
  };
});
