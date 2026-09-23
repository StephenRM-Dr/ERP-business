import type { Currency } from '@/modules/currencies/interfaces/currency.interface';

/**
 * Catalog product as exposed by the backend inventory module.
 * `price` is expressed in USD, the pricing reference currency.
 */
export interface ProductItem {
  id: string;
  code: string;
  name: string;
  price: number;
  currentStock: number;
  permiteDecimales: boolean;
}

/**
 * A single line of the invoice being built (cart item).
 * Amounts are kept in USD and converted to the invoice currency on emission.
 */
export interface InvoiceDetail {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  permiteDecimales: boolean;
  /** Indica si el precio fue editado manualmente en facturación (Precio Mayorista) */
  esPrecioModificado?: boolean;
  /** Backend `factura_venta_detalles.id` — set once the invoice is persisted; required to register a return against this line. */
  facturaItemId?: number;
}

/**
 * Single payment applied to the invoice, as sent to the backend.
 * `amount` is in the payment's own currency; `amountInInvoiceCurrency`
 * is its equivalent converted with the bank rate at emission time.
 * `cuentaBancariaId` is the receiving account and is only meaningful for
 * TRANSFER/MOBILE_PAYMENT (null for CASH/CARD).
 */
export interface InvoicePayment {
  method: 'CASH' | 'CARD' | 'TRANSFER' | 'MOBILE_PAYMENT' | 'ANTICIPO';
  currencyCode: Currency['code'];
  amount: number;
  amountInInvoiceCurrency: number;
  cuentaBancariaId: string | null;
}

/**
 * Payment registered in the UI while the invoice is being built.
 * Its invoice-currency equivalent is derived reactively, never stored,
 * so it stays correct if the invoice currency changes.
 */
export interface RegisteredPayment {
  id: string;
  method: InvoicePayment['method'];
  currencyCode: Currency['code'];
  amount: number;
  cuentaBancariaId: string | null;
}

/** Payment methods that deposit into a specific bank account. */
export const BANK_ACCOUNT_PAYMENT_METHODS: ReadonlyArray<InvoicePayment['method']> = [
  'TRANSFER',
  'MOBILE_PAYMENT',
];

/** i18n keys for each payment method's Spanish/English label — shared by the payment form and the print preview. */
export const PAYMENT_METHOD_LABEL_KEYS: Record<InvoicePayment['method'], string> = {
  CASH: 'invoices.payments.methods.cash',
  CARD: 'invoices.payments.methods.card',
  TRANSFER: 'invoices.payments.methods.transfer',
  MOBILE_PAYMENT: 'invoices.payments.methods.mobilePayment',
  ANTICIPO: 'invoices.payments.methods.anticipo',
};

/**
 * Payload sent to the NestJS backend when issuing an invoice.
 * Monetary amounts are expressed in the invoice currency (`currencyCode`);
 * `exchangeRate` is the bank rate used, in VES per 1 unit of that currency.
 * `termsDays` is only meaningful when `paymentCondition` is 'CREDIT';
 * `payments` is empty for credit invoices (they are paid later).
 * IGTF is levied only on the portion paid in foreign currency, so
 * `igtfAmount` is the IGTF rate applied to the sum of non-VES payments.
 */
export interface CreateInvoicePayload {
  customerId: string;
  paymentCondition: 'CASH' | 'CREDIT';
  termsDays: number | null;
  currencyCode: Currency['code'];
  exchangeRate: number;
  details: InvoiceDetail[];
  payments: InvoicePayment[];
  subtotal: number;
  taxAmount: number;
  igtfAmount: number;
  total: number;
  /** Free-text notes for the invoice (e.g. delivery instructions, internal remarks). */
  notes: string;
  /** Warehouse stock is discounted from. Null lets the backend fall back to the branch's default warehouse. */
  depositoId: number | null;
  /** Indica si la venta es a tarifa nacional */
  esNacional?: boolean;
  /** Sucursal de emisión */
  sucursalId?: number;
  /** Vendedor principal */
  vendedorId?: number | null;
  /** Porcentaje asignado al vendedor 1 */
  porcentajeVendedor1?: number;
  /** Vendedor secundario (ej. colaborador o tienda local) */
  vendedorSecundarioId?: number | null;
  /** Porcentaje asignado al vendedor 2 */
  porcentajeVendedor2?: number;
}

/**
 * Issued invoice as listed by the backend. Carries its full detail lines,
 * payments and amounts so the returns module can load ("call") the invoice
 * and compute refunds. Amounts are in the invoice currency.
 */
export interface Invoice {
  id: string;
  sucursalId: number;
  number: string;
  /** Fiscal control number assigned by the backend (SENIAT compliance), separate from `number`. */
  numeroControl: string | null;
  customerName: string;
  /** Customer's formatted identity document (e.g. "V-12345678"), for the printed invoice. */
  customerDocument: string;
  issuedAt: string;
  /** Time portion of issuance ("HH:MM"), separate from `issuedAt` for backward compat with date-only consumers. */
  issuedTime?: string;
  /** Who issued the invoice: assigned salesperson if any, otherwise the user that created it. */
  issuedByName?: string;
  vendedorId?: number | null;
  vendedorNombre?: string | null;
  porcentajeVendedor1?: number;
  vendedorSecundarioId?: number | null;
  vendedorSecundarioNombre?: string | null;
  porcentajeVendedor2?: number;
  /** Which price list sourced the unit prices ("Local" for Bs, "Precio 50" for Divisa/USD) — only known for invoices created in the current session, not historical reprints. */
  priceListLabel?: string;
  currencyCode: Currency['code'];
  /** Bank rate used at emission time, in VES per 1 unit of `currencyCode`. */
  exchangeRate: number;
  paymentCondition: CreateInvoicePayload['paymentCondition'];
  details: InvoiceDetail[];
  payments: InvoicePayment[];
  subtotal: number;
  /** Discount applied before tax, in `currencyCode` — not persisted by the backend, so only known for invoices created in the current session, not historical reprints. */
  discountAmount?: number;
  taxAmount: number;
  igtfAmount: number;
  total: number;
  notes: string;
  status: 'ISSUED' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'VOIDED';
  voidReason: string | null;
}

/**
 * Minimal customer reference used by selection controls.
 * `document` is the formatted identity document (e.g. "V-12345678"), shown
 * alongside the name so the customer can be found by either.
 */
export interface CustomerOption {
  id: string;
  name: string;
  documentNumber: string;
  document: string;
}
