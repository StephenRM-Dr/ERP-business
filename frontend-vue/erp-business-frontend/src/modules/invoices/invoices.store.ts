import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useCustomerStore } from '@/modules/customers/interfaces/customer.store';
import { useProductStore } from '@/modules/inventory/interfaces/product.store';
import { useStockStore } from '@/modules/inventory/interfaces/stock.store';
import { roundCurrency } from '@/utils/money';
import type {
  CreateInvoicePayload,
  Invoice,
  InvoiceDetail,
  ProductItem,
} from './interfaces/invoice.interface';
import { toFacturaDtoInput, toInvoice, type FacturaDto } from './interfaces/invoice.mapper';

export const TAX_RATE = 0.16;

export const useInvoicesStore = defineStore('invoices', () => {
  // =========================================================================
  // Cart (invoice being built). Amounts are in USD, the pricing reference
  // currency; the creation view converts them to the selected invoice currency.
  // =========================================================================
  const cart = ref<InvoiceDetail[]>([]);

  // Snapshot of each product's available stock taken when the product enters
  // the cart, so quantity changes can be validated client-side. The backend
  // remains the source of truth and must re-validate on submission.
  const stockByProductId = ref<Record<string, number>>({});

  const isEmpty = computed<boolean>(() => cart.value.length === 0);

  const subtotal = computed<number>(() =>
    roundCurrency(cart.value.reduce((sum, item) => sum + item.subtotal, 0)),
  );

  const taxAmount = computed<number>(() => roundCurrency(subtotal.value * TAX_RATE));

  /**
   * Users with 'invoices.sellWithoutStock' can invoice past available stock
   * (the backend allows it and lets inventory go negative) — for them the
   * client-side stock cap is lifted entirely rather than clamped to 0.
   */
  function canSellWithoutStock(): boolean {
    return useAuthStore().hasPermission('invoices.sellWithoutStock');
  }

  /**
   * Returns the stock limit registered for a product in the cart.
   */
  function getStockLimit(productId: string): number {
    if (canSellWithoutStock()) {
      return Infinity;
    }
    return stockByProductId.value[productId] ?? 0;
  }

  /**
   * Adds one unit of the product to the cart, merging with an existing line.
   * Returns false when there is no stock left to cover the new unit.
   */
  function addProduct(product: ProductItem): boolean {
    const unrestricted = canSellWithoutStock();

    if (product.currentStock <= 0 && !unrestricted) {
      return false;
    }

    stockByProductId.value[product.id] = product.currentStock;

    const existingItem = cart.value.find((item) => item.productId === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.currentStock && !unrestricted) {
        return false;
      }
      return updateQuantity(product.id, existingItem.quantity + 1);
    }

    cart.value.push({
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: product.price,
      subtotal: roundCurrency(product.price),
      permiteDecimales: product.permiteDecimales,
    });

    return true;
  }

  /**
   * Sets the quantity of a cart line, clamping it to [1, available stock].
   * Quantities are truncated to whole units unless the product's own
   * permiteDecimales flag allows fractional amounts (e.g. sold by weight).
   * Returns false when the requested quantity had to be adjusted.
   */
  function updateQuantity(productId: string, requestedQuantity: number): boolean {
    const item = cart.value.find((cartItem) => cartItem.productId === productId);

    if (!item) {
      return false;
    }

    const stockLimit = getStockLimit(productId);
    const normalized = Number.isFinite(requestedQuantity)
      ? item.permiteDecimales
        ? roundCurrency(requestedQuantity)
        : Math.trunc(requestedQuantity)
      : 1;
    const clampedQuantity = Math.min(Math.max(normalized, item.permiteDecimales ? 0.01 : 1), stockLimit);

    item.quantity = clampedQuantity;
    item.subtotal = roundCurrency(clampedQuantity * item.unitPrice);

    return clampedQuantity === requestedQuantity;
  }

  function updateUnitPrice(productId: string, newPrice: number): void {
    const item = cart.value.find((i) => i.productId === productId);
    if (item && Number.isFinite(newPrice) && newPrice >= 0) {
      item.unitPrice = roundCurrency(newPrice);
      item.subtotal = roundCurrency(item.quantity * item.unitPrice);
      item.esPrecioModificado = true;
    }
  }

  function resetUnitPrice(productId: string, standardPrice: number): void {
    const item = cart.value.find((i) => i.productId === productId);
    if (item) {
      item.unitPrice = roundCurrency(standardPrice);
      item.subtotal = roundCurrency(item.quantity * item.unitPrice);
      item.esPrecioModificado = false;
    }
  }

  function recalculatePrices(resolvePriceFn: (productId: string) => number): void {
    cart.value.forEach((item) => {
      if (item.esPrecioModificado) {
        // Los precios modificados manualmente (Mayorista) no se sobreescriben
        return;
      }
      const newPrice = resolvePriceFn(item.productId);
      if (newPrice > 0) {
        item.unitPrice = newPrice;
        item.subtotal = roundCurrency(item.quantity * newPrice);
      }
    });
  }

  function removeItem(productId: string): void {
    cart.value = cart.value.filter((item) => item.productId !== productId);
    delete stockByProductId.value[productId];
  }

  function clearCart(): void {
    cart.value = [];
    stockByProductId.value = {};
  }

  // =========================================================================
  // Issued invoices (list, returns and voiding)
  // =========================================================================
  const invoices = ref<Invoice[]>([]);
  const isLoaded = ref(false);

  const sortedInvoices = computed<Invoice[]>(() =>
    [...invoices.value].sort((a, b) => b.number.localeCompare(a.number)),
  );

  /**
   * Loads the real invoice list from GET /facturas. Customer/product/payment-
   * currency names are resolved from the already-fetched customer/product/
   * currencies stores (the backend response only carries their numeric ids);
   * callers should make sure those stores are loaded first for full detail,
   * though a missing lookup falls back to a placeholder rather than failing
   * the whole list.
   */
  async function fetchInvoices(): Promise<void> {
    const { data: page } = await apiClient.get<{ data: FacturaDto[]; total: number }>('/facturas');
    const customerStore = useCustomerStore();
    const currenciesStore = useCurrenciesStore();
    const productStore = useProductStore();

    invoices.value = page.data.map((dto) =>
      toInvoice(
        dto,
        customerStore.getCustomerById(String(dto.cliente_id)),
        currenciesStore.getCurrencyById(String(dto.moneda)),
        productStore.getProductById,
        currenciesStore.getCurrencyById,
      ),
    );
    isLoaded.value = true;
  }

  // =========================================================================
  // Server-driven listing for InvoicesListView — filters + real pagination
  // (empresa/sucursal, condición de pago, búsqueda). Separate from
  // fetchInvoices()/`invoices` above, which other flows (returns, reprint)
  // rely on to have the fuller unfiltered set loaded.
  // =========================================================================
  const pagedInvoices = ref<Invoice[]>([]);
  const pagedTotal = ref<number>(0);
  const isLoadingPage = ref<boolean>(false);

  interface InvoicePageFilters {
    sucursalId?: number;
    empresaId?: number;
    condicionPago?: 'CONTADO' | 'CREDITO';
    search?: string;
    page: number;
    pageSize: number;
  }

  async function fetchInvoicesPage(filters: InvoicePageFilters): Promise<void> {
    isLoadingPage.value = true;
    try {
      const { data: page } = await apiClient.get<{ data: FacturaDto[]; total: number }>('/facturas', {
        params: {
          sucursal_id: filters.sucursalId,
          empresa_id: filters.empresaId,
          condicion_pago: filters.condicionPago,
          search: filters.search || undefined,
          page: filters.page,
          pageSize: filters.pageSize,
        },
      });

      const customerStore = useCustomerStore();
      const currenciesStore = useCurrenciesStore();
      const productStore = useProductStore();

      pagedInvoices.value = page.data.map((dto) =>
        toInvoice(
          dto,
          customerStore.getCustomerById(String(dto.cliente_id)),
          currenciesStore.getCurrencyById(String(dto.moneda)),
          productStore.getProductById,
          currenciesStore.getCurrencyById,
        ),
      );
      pagedTotal.value = page.total;
    } finally {
      isLoadingPage.value = false;
    }
  }

  /**
   * Issues an invoice for real via POST /facturas — persists it, discounts
   * stock server-side, and returns the backend's own correlativo/id — then
   * mirrors it into the local list so InvoicesListView/ReturnsView see it
   * immediately with full detail, without needing a re-fetch.
   */
  async function createInvoice(
    payload: CreateInvoicePayload,
    clienteId: number,
    monedaId: number,
    customerName: string,
    customerDocument: string,
    priceListLabel?: string,
    discountAmount?: number,
  ): Promise<Invoice> {
    const { data } = await apiClient.post<FacturaDto>('/facturas', toFacturaDtoInput(payload, clienteId, monedaId));

    const invoice: Invoice = {
      id: String(data.id),
      sucursalId: data.sucursal_id,
      number: data.correlativo,
      numeroControl: data.numero_control,
      customerName,
      customerDocument,
      issuedAt: new Date().toISOString().slice(0, 10),
      // Same UTC-ISO-vs-local-clock caveat as invoice.mapper.ts's toInvoice().
      issuedTime: data.fecha_emision
        ? new Date(data.fecha_emision).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
        : undefined,
      issuedByName: data.usuario_nombre ?? undefined,
      priceListLabel,
      currencyCode: payload.currencyCode,
      exchangeRate: payload.exchangeRate,
      paymentCondition: payload.paymentCondition,
      details: payload.details.map((detail) => ({
        ...detail,
        facturaItemId: data.items?.find((item) => item.producto_id === Number(detail.productId))?.id,
      })),
      payments: payload.payments.map((payment) => ({ ...payment })),
      subtotal: payload.subtotal,
      discountAmount,
      taxAmount: payload.taxAmount,
      igtfAmount: payload.igtfAmount,
      total: payload.total,
      notes: payload.notes,
      status: 'ISSUED',
      voidReason: null,
    };

    invoices.value.push(invoice);
    // create() discounts stock server-side; refresh so any product picker
    // still open reflects it immediately instead of the pre-sale quantity.
    await useStockStore().fetchStock();
    return invoice;
  }

  /**
   * Syncs the invoice status with how much has effectively been returned.
   * Called by the returns module when a return is registered or voided,
   * so voiding a return can move the invoice back to ISSUED.
   */
  function applyReturnStatus(invoiceId: string, level: 'NONE' | 'PARTIAL' | 'FULL'): void {
    const invoice = invoices.value.find((item) => item.id === invoiceId);

    if (!invoice || invoice.status === 'VOIDED') {
      return;
    }

    if (level === 'NONE') {
      invoice.status = 'ISSUED';
    } else if (level === 'PARTIAL') {
      invoice.status = 'PARTIALLY_RETURNED';
    } else {
      invoice.status = 'RETURNED';
    }
  }

  /**
   * Voids an issued invoice via PATCH /facturas/:id/anular — persists the
   * void server-side (it's what the printed void document attests to), then
   * mirrors the result into the local list.
   */
  async function voidInvoice(invoiceId: string, reason: string): Promise<void> {
    const invoice = invoices.value.find((item) => item.id === invoiceId);
    const trimmedReason = reason.trim();

    if (!invoice || invoice.status !== 'ISSUED' || trimmedReason === '') {
      return;
    }

    await apiClient.patch(`/facturas/${invoiceId}/anular`, { motivo: trimmedReason });

    invoice.status = 'VOIDED';
    invoice.voidReason = trimmedReason;
  }

  // =========================================================================
  // Próximo correlativo (preview sin consumir el contador)
  // =========================================================================
  const proximoCorrelativo = ref<string>('');
  const isLoadingCorrelativo = ref<boolean>(false);

  // sucursalId lets an admin preview another branch's correlativo (e.g. when
  // they switch the dispatch warehouse to one in a different sucursal) — the
  // backend ignores it for non-admins and always returns their own branch's.
  async function fetchProximoCorrelativo(sucursalId?: number | null, esNacional: boolean = false): Promise<void> {
    isLoadingCorrelativo.value = true;
    try {
      const params: Record<string, any> = {};
      if (esNacional) {
        params.es_nacional = true;
      } else if (sucursalId) {
        params.sucursal_id = sucursalId;
      }
      const { data } = await apiClient.get<{ numero: string }>('/facturas/proximo-correlativo', {
        params: Object.keys(params).length > 0 ? params : undefined,
      });
      proximoCorrelativo.value = data.numero;
    } catch {
      proximoCorrelativo.value = '—';
    } finally {
      isLoadingCorrelativo.value = false;
    }
  }

  return {
    // Cart
    cart,
    isEmpty,
    subtotal,
    taxAmount,
    getStockLimit,
    addProduct,
    updateQuantity,
    updateUnitPrice,
    resetUnitPrice,
    recalculatePrices,
    removeItem,
    clearCart,
    // Issued invoices
    invoices,
    isLoaded,
    sortedInvoices,
    fetchInvoices,
    createInvoice,
    applyReturnStatus,
    voidInvoice,
    // Paginated list (InvoicesListView)
    pagedInvoices,
    pagedTotal,
    isLoadingPage,
    fetchInvoicesPage,
    // Correlativo preview
    proximoCorrelativo,
    isLoadingCorrelativo,
    fetchProximoCorrelativo,
  };
});
