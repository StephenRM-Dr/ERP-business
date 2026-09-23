import type { Currency } from '@/modules/currencies/interfaces/currency.interface';
import type { Customer } from '@/modules/customers/interfaces/customer.interface';
import type { Product } from '@/modules/inventory/interfaces/product.interface';
import type { CreateInvoicePayload, Invoice, InvoicePayment } from './invoice.interface';

/** Payload shape expected by POST /facturas (backend/src/facturas). */
export interface FacturaItemDtoInput {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  deposito_id?: number;
}

export interface FacturaPagoDtoInput {
  metodo_pago: string;
  monto: number;
  cuenta_bancaria_id?: number;
  moneda_pago_codigo?: string;
}

export interface CreateFacturaDtoInput {
  cliente_id: number;
  moneda_id: number;
  tasa_cambio: number;
  subtotal: number;
  monto_iva: number;
  igtf: number;
  total: number;
  condicion_pago: 'CONTADO' | 'CREDITO';
  dias_credito?: number;
  items: FacturaItemDtoInput[];
  pagos: FacturaPagoDtoInput[];
  observaciones?: string;
  es_nacional?: boolean;
  sucursal_id?: number;
  vendedor_id?: number;
  porcentaje_vendedor_1?: number;
  vendedor_secundario_id?: number;
  porcentaje_vendedor_2?: number;
}

/**
 * Raw shape returned by POST/GET /facturas — numeric columns come back as
 * strings from pg (typeorm `numeric` type), so callers must `Number()` them.
 */
export interface FacturaDto {
  id: number;
  sucursal_id: number;
  correlativo: string;
  numero_control: string | null;
  cliente_id: number;
  moneda: number;
  tasa_cambio: string | number;
  subtotal: string | number;
  monto_iva?: string | number;
  igtf: string | number;
  total: string | number;
  condicion_pago?: 'CONTADO' | 'CREDITO';
  estado: string;
  fecha_emision?: string;
  usuario_nombre?: string | null;
  vendedor_id?: number | null;
  vendedor_nombre?: string | null;
  porcentaje_vendedor_1?: number | string;
  vendedor_secundario_id?: number | null;
  vendedor_secundario_nombre?: string | null;
  porcentaje_vendedor_2?: number | string;
  observaciones?: string | null;
  items?: {
    id: number;
    producto_id: number;
    cantidad: string | number;
    precio_unitario: string | number;
    subtotal: string | number;
  }[];
  pagos?: {
    id: number;
    /** Spanish forma_pago vocabulary — see toInvoicePaymentMethod() for the reverse mapping of toFormaPago() (backend). */
    metodo_pago: string;
    moneda_pago_id: number;
    monto: string | number;
    cuenta_bancaria_id: number | null;
  }[];
}

/**
 * Maps a `estado` value from the backend ('PENDIENTE' | 'PAGADA' | 'ANULADA')
 * to the frontend's status. There is no backend concept of partially/fully
 * returned yet — that's derived client-side from the returns store once a
 * return is registered against this invoice in the current session.
 */
function toInvoiceStatus(estado: string): Invoice['status'] {
  return estado === 'ANULADA' ? 'VOIDED' : 'ISSUED';
}

/**
 * Reverse of facturas.service.ts's toFormaPago(): lossy for TRANSFERENCIA,
 * which collapses both TRANSFER and MOBILE_PAYMENT on the way in — mapped
 * back to TRANSFER as the more common case. Good enough for display; the
 * distinction only mattered client-side for its own payment form.
 */
function toInvoicePaymentMethod(formaPago: string): InvoicePayment['method'] {
  switch (formaPago) {
    case 'TARJETA_DEBITO':
      return 'CARD';
    case 'TRANSFERENCIA':
      return 'TRANSFER';
    default:
      return 'CASH';
  }
}

/**
 * Builds a frontend `Invoice` from the raw `GET /facturas` shape. Customer
 * name/document and product names aren't included in the backend response,
 * so they're resolved from the already-loaded customer/product stores;
 * `undefined` lookups fall back to a placeholder rather than crashing.
 */
export function toInvoice(
  dto: FacturaDto,
  customer: Customer | undefined,
  currency: Currency | undefined,
  getProductById: (id: string) => Product | undefined,
  getCurrencyById: (id: string) => Currency | undefined,
): Invoice {
  return {
    id: String(dto.id),
    sucursalId: dto.sucursal_id,
    number: dto.correlativo,
    numeroControl: dto.numero_control,
    customerName: customer ? `${customer.firstName} ${customer.lastName}` : '—',
    customerDocument: customer ? `${customer.documentType}-${customer.documentNumber}` : '—',
    issuedAt: dto.fecha_emision ? dto.fecha_emision.slice(0, 10) : '',
    // Backend serializes `fecha_emision` as UTC ISO (its `.toISOString()`),
    // so the time must go through Date/toLocaleTimeString rather than a
    // naive slice — a slice would print the UTC hour, 4h off Venezuela time.
    issuedTime: dto.fecha_emision
      ? new Date(dto.fecha_emision).toLocaleTimeString('es-VE', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : undefined,
    issuedByName: dto.usuario_nombre ?? undefined,
    vendedorId: dto.vendedor_id ?? null,
    vendedorNombre: dto.vendedor_nombre ?? null,
    porcentajeVendedor1: dto.porcentaje_vendedor_1 ? Number(dto.porcentaje_vendedor_1) : undefined,
    vendedorSecundarioId: dto.vendedor_secundario_id ?? null,
    vendedorSecundarioNombre: dto.vendedor_secundario_nombre ?? null,
    porcentajeVendedor2: dto.porcentaje_vendedor_2 ? Number(dto.porcentaje_vendedor_2) : undefined,
    currencyCode: currency?.code ?? 'VES',
    exchangeRate: Number(dto.tasa_cambio),
    paymentCondition: dto.condicion_pago === 'CREDITO' ? 'CREDIT' : 'CASH',
    details: (dto.items ?? []).map((item) => {
      const product = getProductById(String(item.producto_id));
      return {
        productId: String(item.producto_id),
        name: product?.nombre ?? '—',
        quantity: Number(item.cantidad),
        unitPrice: Number(item.precio_unitario),
        subtotal: Number(item.subtotal),
        permiteDecimales: product?.permiteDecimales ?? false,
        facturaItemId: item.id,
      };
    }),
    payments: (dto.pagos ?? []).map((pago) => {
      const pagoCurrency = getCurrencyById(String(pago.moneda_pago_id));
      const amount = Number(pago.monto);
      return {
        method: toInvoicePaymentMethod(pago.metodo_pago),
        currencyCode: pagoCurrency?.code ?? 'VES',
        amount,
        amountInInvoiceCurrency: amount,
        cuentaBancariaId: pago.cuenta_bancaria_id !== null ? String(pago.cuenta_bancaria_id) : null,
      };
    }),
    subtotal: Number(dto.subtotal),
    taxAmount: Number(dto.monto_iva ?? 0),
    igtfAmount: Number(dto.igtf),
    total: Number(dto.total),
    notes: dto.observaciones ?? '',
    status: toInvoiceStatus(dto.estado),
    voidReason: dto.estado === 'ANULADA' ? (dto.observaciones ?? null) : null,
  };
}

/**
 * Builds the POST /facturas payload from the invoice creation form's state.
 * `clienteId` and `monedaId` are resolved separately (customer/currency
 * stores hold them as strings for internal use) since CreateInvoicePayload
 * itself only carries the currency *code*, not the backend's numeric FK.
 */
export function toFacturaDtoInput(
  payload: CreateInvoicePayload,
  clienteId: number,
  monedaId: number,
): CreateFacturaDtoInput {
  return {
    cliente_id: clienteId,
    moneda_id: monedaId,
    tasa_cambio: payload.exchangeRate,
    subtotal: payload.subtotal,
    monto_iva: payload.taxAmount,
    igtf: payload.igtfAmount,
    total: payload.total,
    condicion_pago: payload.paymentCondition === 'CREDIT' ? 'CREDITO' : 'CONTADO',
    ...(payload.paymentCondition === 'CREDIT' && payload.termsDays !== null
      ? { dias_credito: payload.termsDays }
      : {}),
    items: payload.details.map((detail) => ({
      producto_id: Number(detail.productId),
      cantidad: detail.quantity,
      precio_unitario: detail.unitPrice,
      subtotal: detail.subtotal,
      ...(payload.depositoId !== null ? { deposito_id: payload.depositoId } : {}),
    })),
    pagos: payload.payments.map((payment) => ({
      metodo_pago: payment.method,
      monto: payment.amount,
      moneda_pago_codigo: payment.currencyCode,
      ...(payment.cuentaBancariaId !== null
        ? { cuenta_bancaria_id: Number(payment.cuentaBancariaId) }
        : {}),
    })),
    ...(payload.notes.trim() !== '' ? { observaciones: payload.notes.trim() } : {}),
    ...(payload.esNacional !== undefined ? { es_nacional: payload.esNacional } : {}),
    ...(payload.sucursalId !== undefined ? { sucursal_id: payload.sucursalId } : {}),
    ...(payload.vendedorId ? { vendedor_id: payload.vendedorId } : {}),
    ...(payload.porcentajeVendedor1 !== undefined ? { porcentaje_vendedor_1: payload.porcentajeVendedor1 } : {}),
    ...(payload.vendedorSecundarioId ? { vendedor_secundario_id: payload.vendedorSecundarioId } : {}),
    ...(payload.porcentajeVendedor2 !== undefined ? { porcentaje_vendedor_2: payload.porcentajeVendedor2 } : {}),
  };
}
