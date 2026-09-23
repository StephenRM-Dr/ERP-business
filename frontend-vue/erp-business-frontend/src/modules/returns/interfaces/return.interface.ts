import type { Currency } from '@/modules/currencies/interfaces/currency.interface';

/**
 * One line being returned. `quantity` is the number of units given back
 * (may be less than the invoiced quantity on partial returns); amounts
 * are in the invoice currency.
 */
export interface ReturnItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  /** Backend `factura_venta_detalles.id` this line is returned against. */
  facturaItemId?: number;
}

/**
 * Payload sent to the NestJS backend when registering a return.
 * `refundTotal` includes the proportional share of VAT/IGTF, computed
 * with the invoice's own total-to-subtotal ratio; the backend recomputes
 * it authoritatively when generating the credit note.
 */
export interface CreateReturnPayload {
  invoiceId: string;
  invoiceNumber: string;
  type: 'TOTAL' | 'PARTIAL';
  items: ReturnItem[];
  itemsSubtotal: number;
  refundTotal: number;
  currencyCode: Currency['code'];
  /** Mandatory reason for the return, kept for the audit trail / printed document. */
  reason: string;
}

/**
 * Registered return (credit note) as listed by the backend.
 * A VOIDED return no longer counts against the invoice: its quantities
 * become returnable again and the invoice status is recomputed.
 */
export interface InvoiceReturn extends CreateReturnPayload {
  id: string;
  number: string;
  date: string;
  status: 'ACTIVE' | 'VOIDED';
  voidReason: string | null;
  customerName: string;
  customerDocument: string;
}
