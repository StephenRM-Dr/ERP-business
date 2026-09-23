<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import apiClient from '@/api/axios-client';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useExchangeRatesStore } from '@/modules/currencies/exchange-rates.store';
import type { Currency } from '@/modules/currencies/interfaces/currency.interface';
import { useCustomerStore } from '@/modules/customers/interfaces/customer.store';
import { useWarehouseStore } from '@/modules/inventory/interfaces/warehouse.store';
import { useProductStore } from '@/modules/inventory/interfaces/product.store';
import { useStockStore } from '@/modules/inventory/interfaces/stock.store';
import { useBancoStore } from '@/modules/master/bancos/interfaces/banco.store';
import { useCuentaBancariaStore } from '@/modules/master/cuentas-bancarias/interfaces/cuenta-bancaria.store';
import { useVendedorStore } from '@/modules/master/vendedores/interfaces/vendedor.store';
import { useCompanyInfo } from '@/composables/useCompanyInfo';
import { resolveApiErrorMessage } from '@/utils/api-error';
import { generateId } from '@/utils/id';
import { formatMoney, roundCurrency, isForeignCurrency } from '@/utils/money';
import PreliminarPickerDialog from '@/modules/preliminares/components/PreliminarPickerDialog.vue';
import { usePreliminaresStore } from '@/modules/preliminares/preliminares.store';
import type {
  InvoicePreliminarPayload,
  PreliminarSummary,
} from '@/modules/preliminares/interfaces/preliminar.interface';
import InvoicePrintPreview from '../components/InvoicePrintPreview.vue';
import InvoiceReprintModal from '../components/InvoiceReprintModal.vue';
import InvoiceInventoryModal from '../components/InvoiceInventoryModal.vue';
import InvoiceCustomersModal from '../components/InvoiceCustomersModal.vue';
import InvoicePaymentModal from '../components/InvoicePaymentModal.vue';
import InvoiceQuickCustomerModal from '../components/InvoiceQuickCustomerModal.vue';
import InvoiceCashierRateModal from '../components/InvoiceCashierRateModal.vue';
import { useIgtfStore } from '../igtf.store';
import { TAX_RATE, useInvoicesStore } from '../invoices.store';
import {
  type CreateInvoicePayload,
  type CustomerOption,
  type Invoice,
  type InvoicePayment,
  type ProductItem,
  type RegisteredPayment,
} from '../interfaces/invoice.interface';

const { t } = useI18n();
const authStore = useAuthStore();
const invoicesStore = useInvoicesStore();
const preliminaresStore = usePreliminaresStore();
const currenciesStore = useCurrenciesStore();
const exchangeRatesStore = useExchangeRatesStore();
const igtfStore = useIgtfStore();
const customerStore = useCustomerStore();
const productStore = useProductStore();
const stockStore = useStockStore();
const warehouseStore = useWarehouseStore();
const bancoStore = useBancoStore();
const cuentaBancariaStore = useCuentaBancariaStore();
const vendedorStore = useVendedorStore();
const { ensureLoaded: ensureCompanyLoaded, companyFor } = useCompanyInfo();

const issuedInvoice = ref<Invoice | null>(null);

const companyInfo = computed(() =>
  companyFor(
    selectedWarehouseId.value === null
      ? null
      : warehouseStore.getWarehouseById(String(selectedWarehouseId.value))?.sucursalId ?? null,
  ),
);

function closePrintPreview(): void {
  issuedInvoice.value = null;
}

const router = useRouter();

// --- Estados para la Barra de Herramientas POS, Cajero & Modales ---
const isFullscreen = ref<boolean>(false);
const showReprintModal = ref<boolean>(false);
const showInventoryModal = ref<boolean>(false);
const showCustomersModal = ref<boolean>(false);
const showQuickCustomerModal = ref<boolean>(false);
const showPaymentModal = ref<boolean>(false);
const showCashierRateModal = ref<boolean>(false);

// --- Autenticación / Inicio de Turno del Cajero en POS ---
const isCashierUnlocked = ref<boolean>(false);
const cashierUsername = ref<string>(authStore.user?.username || '');
const cashierPassword = ref<string>('');
const isVerifyingCashier = ref<boolean>(false);
const cashierUnlockError = ref<string>('');
const activeCashierName = ref<string>(authStore.user?.nombreCompleto || 'Cajero Principal');
const cashierPasswordInput = ref<HTMLInputElement | null>(null);

async function handleUnlockCashier(): Promise<void> {
  cashierUnlockError.value = '';
  if (!cashierPassword.value) {
    cashierUnlockError.value = 'Por favor ingresa tu contraseña de cajero';
    cashierPasswordInput.value?.focus();
    return;
  }
  isVerifyingCashier.value = true;
  try {
    let authorized = false;
    let authName = '';

    try {
      const res = await apiClient.post('/auth/verify-supervisor', {
        username: cashierUsername.value.trim() || undefined,
        password: cashierPassword.value,
      });
      if (res.data?.success) {
        authorized = true;
        authName = res.data.authorizedBy || authStore.user?.nombreCompleto || 'Cajero Principal';
      }
    } catch (e: any) {
      // Fallback a login si el endpoint verify-supervisor devuelve 404 o no está disponible
      const loginRes = await apiClient.post('/auth/login', {
        username: cashierUsername.value.trim() || authStore.user?.username || 'admin',
        password: cashierPassword.value,
      });
      if (loginRes.data?.accessToken || loginRes.data?.user) {
        authorized = true;
        authName = loginRes.data?.user?.nombreCompleto || loginRes.data?.user?.username || 'Cajero Principal';
      }
    }

    if (authorized) {
      isCashierUnlocked.value = true;
      activeCashierName.value = authName || authStore.user?.nombreCompleto || 'Cajero Principal';
      cashierPassword.value = '';
      cashierUnlockError.value = '';
    } else {
      cashierUnlockError.value = 'Contraseña o usuario de cajero incorrecto';
    }
  } catch (err: any) {
    cashierUnlockError.value = err?.response?.data?.message || 'Contraseña incorrecta';
  } finally {
    isVerifyingCashier.value = false;
  }
}

function handleLockCashier(): void {
  isCashierUnlocked.value = false;
  cashierPassword.value = '';
  cashierUnlockError.value = '';
}

function toggleFullscreen(): void {
  isFullscreen.value = !isFullscreen.value;
  if (isFullscreen.value) {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  } else {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }
}

function handleClosePos(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }
  router.push('/dashboard');
}

function handleRateUpdated(newRate: number, currencyCode: string): void {
  feedbackMessage.value = `Tasa de ${currencyCode} actualizada a ${newRate.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
  setTimeout(() => {
    if (feedbackMessage.value.startsWith('Tasa de')) {
      feedbackMessage.value = '';
    }
  }, 4000);
}

function onFullscreenChange(): void {
  if (!document.fullscreenElement && isFullscreen.value) {
    isFullscreen.value = false;
  }
}

function onReprintFromModal(inv: Invoice): void {
  showReprintModal.value = false;
  issuedInvoice.value = inv;
}

function onAddProductFromModal(prod: any, quantity: number): void {
  const item = catalogProducts.value.find((p) => String(p.id) === String(prod.id));
  if (item) {
    for (let i = 0; i < quantity; i++) {
      invoicesStore.addProduct(item);
    }
    feedbackMessage.value = `Se agregaron ${quantity} unidad(es) de ${item.name} al carrito`;
    setTimeout(() => {
      if (feedbackMessage.value.startsWith('Se agregaron')) {
        feedbackMessage.value = '';
      }
    }, 3000);
  }
}

function onSelectCustomerFromModal(cust: any): void {
  const found = customerOptions.value.find((c) => String(c.id) === String(cust.id));
  if (found) {
    selectCustomer(found);
  } else {
    selectedCustomerId.value = String(cust.id);
  }
}

// Global POS Function Key listener
function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'F2') {
    e.preventDefault();
    showInventoryModal.value = true;
  } else if (e.key === 'F3') {
    e.preventDefault();
    showQuickCustomerModal.value = true;
  } else if (e.key === 'F4') {
    e.preventDefault();
    showCustomersModal.value = true;
  } else if (e.key === 'F5') {
    e.preventDefault();
    showCashierRateModal.value = true;
  } else if (e.key === 'l' && e.ctrlKey) {
    e.preventDefault();
    handleLockCashier();
  } else if (e.key === 'F6') {
    e.preventDefault();
    if (canSavePreliminar.value && !isSavingPreliminar.value) {
      savePreliminar();
    }
  } else if (e.key === 'F7') {
    e.preventDefault();
    openPreliminarPicker();
  } else if (e.key === 'F8') {
    e.preventDefault();
    openPreliminarPrint();
  } else if (e.key === 'F9') {
    e.preventDefault();
    showInventoryModal.value = true;
  } else if (e.key === 'F10') {
    e.preventDefault();
    showReprintModal.value = true;
  } else if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreen();
  } else if (e.key === 'F12') {
    e.preventDefault();
    if (!showPaymentModal.value) {
      openPaymentModal();
    } else if (canSubmit.value && !isSubmitting.value) {
      handleSubmit();
    }
  } else if (e.key === 'Escape') {
    if (showPaymentModal.value) {
      showPaymentModal.value = false;
    } else if (showQuickCustomerModal.value) {
      showQuickCustomerModal.value = false;
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  if (currenciesStore.currencies.length === 0) {
    currenciesStore.fetchCurrencies();
  }
  if (exchangeRatesStore.rates.length === 0) {
    exchangeRatesStore.fetchRates();
  }
  ensureCompanyLoaded();
  if (customerStore.customerList.length === 0) {
    customerStore.fetchCustomers();
  }
  if (productStore.productList.length === 0) {
    productStore.fetchProducts();
  }
  if (cuentaBancariaStore.cuentaList.length === 0) {
    cuentaBancariaStore.fetchCuentas();
  }
  if (bancoStore.bancoList.length === 0) {
    bancoStore.fetchBancos();
  }
  if (stockStore.stockList.length === 0) {
    stockStore.fetchStock();
  }
  vendedorStore.fetchVendedores();
  if (warehouseStore.warehouseList.length === 0) {
    warehouseStore.fetchWarehouses();
  }
  if (!igtfStore.isLoaded) {
    igtfStore.fetchIgtf();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
});

const canChooseWarehouse = computed<boolean>(() => true);

const availableWarehouses = computed(() => {
  const active = warehouseStore.sortedWarehouses.filter(
    (warehouse) => warehouse.isActive && warehouse.permiteFacturar !== false,
  );
  return active.length > 0 ? active : warehouseStore.sortedWarehouses;
});

const selectedWarehouseId = ref<number | null>(null);

watch(
  availableWarehouses,
  (warehouses) => {
    if (selectedWarehouseId.value !== null && warehouses.some((w) => Number(w.id) === selectedWarehouseId.value)) {
      return;
    }
    const lowestId = warehouses.reduce<number | null>((lowest, warehouse) => {
      const id = Number(warehouse.id);
      return lowest === null || id < lowest ? id : lowest;
    }, null);
    selectedWarehouseId.value = lowestId;
  },
  { immediate: true },
);

const canUseNationalPrice = computed<boolean>(
  () => authStore.user?.rolId === 1 || authStore.hasPermission('invoices.priceNational'),
);

const canUseLocalPrice = computed<boolean>(
  () => authStore.user?.rolId === 1 || authStore.hasPermission('invoices.priceLocal'),
);

const canEditPrice = computed<boolean>(
  () => authStore.user?.rolId === 1 || authStore.hasPermission('invoices.editPrice'),
);

const isNationalPrice = ref<boolean>(false);

watch(
  [canUseNationalPrice, canUseLocalPrice],
  ([national, local]) => {
    if (national && !local) {
      isNationalPrice.value = true;
    } else if (!national && local) {
      isNationalPrice.value = false;
    }
  },
  { immediate: true },
);

watch(
  [selectedWarehouseId, isNationalPrice],
  ([warehouseId, isNac]) => {
    const sucursalId =
      warehouseId === null
        ? null
        : (warehouseStore.getWarehouseById(String(warehouseId))?.sucursalId ?? null);
    invoicesStore.fetchProximoCorrelativo(sucursalId, isNac);
  },
  { immediate: true },
);

const isBsPriceList = ref<boolean>(false);
const INVOICE_CURRENCY_CODE: Currency['code'] = 'USD';

function getNivelPrecioId(warehouseId: number | null, isBs: boolean, isNational: boolean): number {
  if (isNational) {
    return isBs ? 10 : 12;
  }
  if (isBs) {
    switch (warehouseId) {
      case 1: return 2;
      case 3: return 3;
      case 6: return 4;
      case 8: return 5;
      case 9: return 6;
      case 4: return 7;
      case 10: return 8;
      case 7: return 9;
      default: return 2;
    }
  } else {
    switch (warehouseId) {
      case 1:
      case 3:
      case 6: return 11;
      case 8: return 13;
      case 9: return 14;
      case 4: return 15;
      case 10: return 16;
      case 7: return 17;
      default: return 11;
    }
  }
}

function resolveProductPrice(product: { id: string; precioVenta?: number | null; precioCosto?: number | null; precios?: Array<{ nivelPrecioId: number; precio: number }> }): number {
  const isBs = isBsPriceList.value;
  const targetNivelId = getNivelPrecioId(selectedWarehouseId.value, isBs, isNationalPrice.value);

  if (product.precios && product.precios.length > 0) {
    const pItem = product.precios.find((p) => p.nivelPrecioId === targetNivelId);
    if (pItem && pItem.precio > 0) {
      return pItem.precio;
    }
  }
  return isBs ? (product.precioVenta ?? 0) : (product.precioCosto || product.precioVenta || 0);
}

function normalizeText(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const catalogProducts = computed<ProductItem[]>(() =>
  productStore.sortedProducts.map((product) => ({
    id: product.id,
    code: product.codigo || (product as any).referencia || '',
    name: product.nombre || '',
    referencia: product.referencia || '',
    marca: product.marca || '',
    modelo: product.modelo || '',
    descripcionDetallada: product.descripcionDetallada || '',
    price: resolveProductPrice(product),
    currentStock:
      selectedWarehouseId.value === null
        ? 0
        : stockStore.stockList
            .filter(
              (item) =>
                String(item.productId) === String(product.id) &&
                String(item.warehouseId) === String(selectedWarehouseId.value),
            )
            .reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    permiteDecimales: product.permiteDecimales,
  })),
);

watch(
  [selectedWarehouseId, isBsPriceList, isNationalPrice],
  () => {
    invoicesStore.recalculatePrices((productId) => {
      const product = productStore.getProductById(productId);
      return product ? resolveProductPrice(product) : 0;
    });
  },
  { immediate: true },
);

const PAYMENT_TOLERANCE = 0.01;

const customerOptions = computed<CustomerOption[]>(() =>
  customerStore.sortedCustomers.map((customer) => ({
    id: customer.id,
    name: `${customer.firstName} ${customer.lastName}`,
    documentNumber: customer.documentNumber,
    document: `${customer.documentType}-${customer.documentNumber}`,
  })),
);

const searchTerm = ref<string>('');
const activeSearchIndex = ref<number>(-1);

watch(searchTerm, () => {
  activeSearchIndex.value = -1;
});

function navigateSearch(direction: number): void {
  if (filteredProducts.value.length === 0) return;
  let next = activeSearchIndex.value + direction;
  if (next < 0) next = filteredProducts.value.length - 1;
  if (next >= filteredProducts.value.length) next = 0;
  activeSearchIndex.value = next;
}

function handleSearchEnter(): void {
  if (filteredProducts.value.length === 0) return;

  if (activeSearchIndex.value >= 0 && activeSearchIndex.value < filteredProducts.value.length) {
    const item = filteredProducts.value[activeSearchIndex.value];
    if (item) handleAddProduct(item);
    return;
  }

  const normalizedSearch = normalizeText(searchTerm.value);
  const exact = filteredProducts.value.find(
    (p) => normalizeText(p.code) === normalizedSearch || normalizeText((p as any).referencia) === normalizedSearch,
  );
  if (exact) {
    handleAddProduct(exact);
    return;
  }

  const first = filteredProducts.value[0];
  if (first) {
    handleAddProduct(first);
  }
}

const selectedCustomerId = ref<string>('');
const customerSearchTerm = ref<string>('');
const invoiceNotes = ref<string>('');
const paymentCondition = ref<CreateInvoicePayload['paymentCondition']>('CASH');
const termsDays = ref<number>(30);
const feedbackMessage = ref<string>('');
const isSubmitting = ref<boolean>(false);

const applyVat = ref<boolean>(true);
const applyIgtf = ref<boolean>(true);

// ─── Asignación de Vendedor(es) y Comisión ───
const selectedVendedorId = ref<number | null>(null);
const isCommissionSplit = ref<boolean>(false);
const selectedVendedorSecundarioId = ref<number | null>(null);
const porcentajeVendedor1 = ref<number>(50);
const porcentajeVendedor2 = ref<number>(50);

function handleSplitToggle(): void {
  if (isCommissionSplit.value) {
    porcentajeVendedor1.value = 50;
    porcentajeVendedor2.value = 50;
  } else {
    porcentajeVendedor1.value = 100;
    porcentajeVendedor2.value = 0;
    selectedVendedorSecundarioId.value = null;
  }
}

function handlePct1Change(event: Event): void {
  const val = Number((event.target as HTMLInputElement).value);
  const clamped = Math.max(0, Math.min(100, isNaN(val) ? 50 : val));
  porcentajeVendedor1.value = clamped;
  porcentajeVendedor2.value = 100 - clamped;
}

function handlePct2Change(event: Event): void {
  const val = Number((event.target as HTMLInputElement).value);
  const clamped = Math.max(0, Math.min(100, isNaN(val) ? 50 : val));
  porcentajeVendedor2.value = clamped;
  porcentajeVendedor1.value = 100 - clamped;
}

// Registered payments
const payments = ref<RegisteredPayment[]>([]);

const filteredProducts = computed<ProductItem[]>(() => {
  const rawTerm = searchTerm.value.trim();

  if (rawTerm.length === 0) {
    return [];
  }

  const searchTokens = normalizeText(rawTerm).split(/\s+/).filter(Boolean);

  return catalogProducts.value
    .filter((product) => {
      const pCode = normalizeText(product.code);
      const pName = normalizeText(product.name);
      const pRef = normalizeText((product as any).referencia);
      const pMarca = normalizeText((product as any).marca);
      const pModelo = normalizeText((product as any).modelo);
      const pDesc = normalizeText((product as any).descripcionDetallada);
      const combined = `${pCode} ${pName} ${pRef} ${pMarca} ${pModelo} ${pDesc}`;

      return searchTokens.every((token) => combined.includes(token));
    })
    .slice(0, 50);
});

// --- Customer search & Details ---
const selectedCustomerOption = computed<CustomerOption | undefined>(() =>
  customerOptions.value.find((customer) => customer.id === selectedCustomerId.value),
);

const selectedCustomerFull = computed(() => {
  if (!selectedCustomerId.value) return null;
  return customerStore.getCustomerById(selectedCustomerId.value);
});

const filteredCustomerOptions = computed<CustomerOption[]>(() => {
  const term = customerSearchTerm.value.trim().toLowerCase();

  if (term.length === 0) {
    return [];
  }

  return customerOptions.value.filter(
    (customer) =>
      customer.name.toLowerCase().includes(term) ||
      customer.documentNumber.toLowerCase().includes(term) ||
      customer.document.toLowerCase().includes(term),
  );
});

function selectCustomer(customer: CustomerOption): void {
  selectedCustomerId.value = customer.id;
  customerSearchTerm.value = '';
}

function clearCustomerSelection(): void {
  selectedCustomerId.value = '';
  customerSearchTerm.value = '';
  customerAnticipoDisponible.value = 0;
}

// --- Anticipos del cliente ---
const customerAnticipoDisponible = ref<number>(0);

watch(selectedCustomerId, async (clientId) => {
  customerAnticipoDisponible.value = 0;
  if (clientId) {
    try {
      const { data } = await apiClient.get(`/cuentas-cobrar/cliente/${clientId}/resumen`);
      if (data && data.totales) {
        customerAnticipoDisponible.value = (Number(data.totales.adelantos) || 0) + (Number(data.totales.devolucionesPendientes) || 0);
      }
    } catch {
      customerAnticipoDisponible.value = 0;
    }
  }
});

function handleApplyAnticipo(): void {
  if (customerAnticipoDisponible.value <= 0 || remainingAmount.value <= 0) return;
  const amountToApply = Math.min(customerAnticipoDisponible.value, remainingAmount.value);

  const existingAnticipo = payments.value.find((p) => p.method === 'ANTICIPO');
  if (existingAnticipo) {
    existingAnticipo.amount = roundCurrency(amountToApply);
  } else {
    payments.value.push({
      id: `pay-${generateId()}`,
      method: 'ANTICIPO',
      currencyCode: INVOICE_CURRENCY_CODE,
      amount: roundCurrency(amountToApply),
      cuentaBancariaId: null,
    });
  }
}

function handleAddPaymentFromModal(p: {
  method: InvoicePayment['method'];
  currencyCode: Currency['code'];
  amount: number;
  cuentaBancariaId: string | null;
}): void {
  payments.value.push({
    id: `pay-${generateId()}`,
    method: p.method,
    currencyCode: p.currencyCode,
    amount: roundCurrency(p.amount),
    cuentaBancariaId: p.cuentaBancariaId,
  });
}

function removePayment(paymentId: string): void {
  payments.value = payments.value.filter((payment) => payment.id !== paymentId);
}

// --- Multi-currency ---
const isRateMissing = computed<boolean>(() => exchangeRatesStore.rateFor('USD') === 0);

const currentBankRate = computed<number>(() =>
  exchangeRatesStore.convert(1, INVOICE_CURRENCY_CODE, 'VES'),
);

function displayMoney(amountUsd: number): string {
  return formatMoney(amountUsd, INVOICE_CURRENCY_CODE);
}

function paymentInInvoiceCurrency(payment: RegisteredPayment): number {
  return exchangeRatesStore.convert(
    payment.amount,
    payment.currencyCode,
    INVOICE_CURRENCY_CODE,
  );
}

const paidTotal = computed<number>(() =>
  roundCurrency(
    payments.value.reduce((sum, payment) => sum + paymentInInvoiceCurrency(payment), 0),
  ),
);

const foreignPaidTotal = computed<number>(() => {
  return roundCurrency(
    payments.value
      .filter((payment) => isForeignCurrency(payment.currencyCode))
      .reduce((sum, payment) => sum + paymentInInvoiceCurrency(payment), 0)
  );
});

// --- Reactive totals ---
const subtotal = computed<number>(() => roundCurrency(invoicesStore.subtotal));

const fleteEnabled = ref<boolean>(false);
const fleteAmount = ref<number | null>(null);
const fleteValue = computed<number>(() =>
  fleteEnabled.value ? roundCurrency(fleteAmount.value ?? 0) : 0,
);

const discountInput = ref<string>('');
const baseBeforeDiscount = computed<number>(() => roundCurrency(subtotal.value + fleteValue.value));
const discountAmount = computed<number>(() => {
  const trimmed = discountInput.value.trim();
  if (trimmed === '') {
    return 0;
  }
  const isPercent = trimmed.endsWith('%');
  const parsed = Number(isPercent ? trimmed.slice(0, -1) : trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  const amount = isPercent ? baseBeforeDiscount.value * (parsed / 100) : parsed;
  return roundCurrency(Math.min(amount, baseBeforeDiscount.value));
});

const taxableBase = computed<number>(() =>
  roundCurrency(Math.max(0, baseBeforeDiscount.value - discountAmount.value)),
);

const taxAmount = computed<number>(() =>
  applyVat.value ? roundCurrency(taxableBase.value * TAX_RATE) : 0,
);

const igtfAvailable = computed<boolean>(
  () => igtfStore.isEnabled && paymentCondition.value === 'CASH',
);

const igtfAmount = computed<number>(() =>
  igtfAvailable.value && applyIgtf.value
    ? roundCurrency(foreignPaidTotal.value * (igtfStore.ratePercent / 100))
    : 0,
);

const grandTotal = computed<number>(() =>
  roundCurrency(taxableBase.value + taxAmount.value + igtfAmount.value),
);

const remainingAmount = computed<number>(() =>
  roundCurrency(Math.max(0, grandTotal.value - paidTotal.value)),
);

const changeAmount = computed<number>(() =>
  roundCurrency(Math.max(0, paidTotal.value - grandTotal.value)),
);

const isFullyPaid = computed<boolean>(() => remainingAmount.value <= PAYMENT_TOLERANCE);

const canSubmit = computed<boolean>(
  () =>
    !invoicesStore.isEmpty &&
    !isRateMissing.value &&
    selectedCustomerId.value !== '' &&
    selectedWarehouseId.value !== null &&
    (paymentCondition.value === 'CREDIT' || isFullyPaid.value),
);

const isVes020InUse = computed<boolean>(
  () => payments.value.some((payment) => payment.currencyCode === 'VES020'),
);

const totalsByCurrency = computed(() =>
  currenciesStore.activeCurrencies
    .filter((currency) => currency.code !== INVOICE_CURRENCY_CODE)
    .filter((currency) => currency.code !== 'VES020' || isVes020InUse.value)
    .map((currency) => ({
      code: currency.code,
      amount: exchangeRatesStore.convert(grandTotal.value, INVOICE_CURRENCY_CODE, currency.code),
    })),
);

// --- Handlers ---
function handleAddProduct(product: ProductItem): void {
  const added = invoicesStore.addProduct(product);
  searchTerm.value = '';

  if (added) {
    feedbackMessage.value = '';
  } else if (product.currentStock <= 0) {
    feedbackMessage.value = t('invoices.outOfStock');
  } else {
    feedbackMessage.value = t('invoices.maxStockReached', { stock: product.currentStock });
  }
}

function handleQuantityInput(productId: string, event: Event): void {
  const input = event.target as HTMLInputElement;
  const requestedQuantity = Number(input.value);
  const accepted = invoicesStore.updateQuantity(productId, requestedQuantity);

  const item = invoicesStore.cart.find((cartItem) => cartItem.productId === productId);
  if (item) {
    input.value = String(item.quantity);
  }

  feedbackMessage.value = accepted
    ? ''
    : t('invoices.maxStockReached', { stock: invoicesStore.getStockLimit(productId) });
}

function handlePriceInput(productId: string, event: Event): void {
  const input = event.target as HTMLInputElement;
  const newPrice = Number(input.value);
  if (Number.isFinite(newPrice) && newPrice >= 0) {
    invoicesStore.updateUnitPrice(productId, newPrice);
  } else {
    const item = invoicesStore.cart.find((cartItem) => cartItem.productId === productId);
    if (item) {
      input.value = String(item.unitPrice);
    }
  }
}

function handleResetPrice(productId: string): void {
  const product = productStore.getProductById(productId);
  if (product) {
    const originalPrice = resolveProductPrice(product);
    invoicesStore.resetUnitPrice(productId, originalPrice);
  }
}

function selectPaymentCondition(condition: CreateInvoicePayload['paymentCondition']): void {
  paymentCondition.value = condition;
  if (condition === 'CREDIT') {
    payments.value = [];
  }
}

function openPaymentModal(): void {
  if (!selectedCustomerId.value) {
    feedbackMessage.value = 'Debe seleccionar un cliente antes de procesar el pago.';
    return;
  }
  if (invoicesStore.isEmpty) {
    feedbackMessage.value = 'El carrito está vacío. Agregue productos antes de cobrar.';
    return;
  }
  if (selectedWarehouseId.value === null) {
    feedbackMessage.value = 'Seleccione un almacén de despacho.';
    return;
  }
  feedbackMessage.value = '';
  showPaymentModal.value = true;
}

async function creditCuentaBancaria(cuentaId: string, amount: number): Promise<boolean> {
  const cuenta = cuentaBancariaStore.getCuentaById(cuentaId);
  if (!cuenta) {
    return true;
  }

  try {
    await cuentaBancariaStore.updateCuenta(cuentaId, {
      bancoId: cuenta.bancoId,
      numeroCuenta: cuenta.numeroCuenta,
      tipoCuenta: cuenta.tipoCuenta,
      monedaId: cuenta.monedaId,
      descripcion: cuenta.descripcion,
      saldoConciliado: roundCurrency(cuenta.saldoConciliado + amount),
      activo: cuenta.activo,
    });
    return true;
  } catch {
    return false;
  }
}

async function handleSubmit(): Promise<void> {
  if (isSubmitting.value) {
    return;
  }

  if (paymentCondition.value === 'CASH') {
    if (!showPaymentModal.value) {
      openPaymentModal();
      return;
    }
    if (!isFullyPaid.value) {
      feedbackMessage.value = t('invoices.payments.incomplete');
      return;
    }
  }

  if (!canSubmit.value || selectedCustomerId.value === '') {
    return;
  }

  isSubmitting.value = true;

  try {
    await submitInvoice();
    showPaymentModal.value = false;
  } finally {
    isSubmitting.value = false;
  }
}

async function submitInvoice(): Promise<void> {
  const payload: CreateInvoicePayload = {
    customerId: selectedCustomerId.value,
    paymentCondition: paymentCondition.value,
    termsDays: paymentCondition.value === 'CREDIT' ? termsDays.value : null,
    currencyCode: INVOICE_CURRENCY_CODE,
    exchangeRate: currentBankRate.value,
    details: invoicesStore.cart.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: roundCurrency(item.unitPrice),
      subtotal: roundCurrency(item.subtotal),
      permiteDecimales: item.permiteDecimales,
    })),
    payments: payments.value.map((payment) => ({
      method: payment.method,
      currencyCode: payment.currencyCode,
      amount: payment.amount,
      amountInInvoiceCurrency: paymentInInvoiceCurrency(payment),
      cuentaBancariaId: payment.cuentaBancariaId,
    })),
    subtotal: taxableBase.value,
    taxAmount: taxAmount.value,
    igtfAmount: igtfAmount.value,
    total: grandTotal.value,
    notes: invoiceNotes.value.trim(),
    depositoId: selectedWarehouseId.value,
    esNacional: isNationalPrice.value,
    sucursalId:
      selectedWarehouseId.value === null
        ? undefined
        : (warehouseStore.getWarehouseById(String(selectedWarehouseId.value))?.sucursalId ?? undefined),
    vendedorId: selectedVendedorId.value,
    porcentajeVendedor1: isCommissionSplit.value ? porcentajeVendedor1.value : 100,
    vendedorSecundarioId: isCommissionSplit.value ? selectedVendedorSecundarioId.value : null,
    porcentajeVendedor2: isCommissionSplit.value ? porcentajeVendedor2.value : 0,
  };

  const monedaId = currenciesStore.findByCode(INVOICE_CURRENCY_CODE)?.id;
  if (!monedaId) {
    feedbackMessage.value = t('invoices.currency.missingRate');
    return;
  }

  const customerName = selectedCustomerOption.value?.name ?? '';
  const customerDocument = selectedCustomerOption.value?.document ?? '';

  const hasCustomPrice = invoicesStore.cart.some((item) => item.esPrecioModificado);
  const priceListLabel = hasCustomPrice
    ? 'Precio Mayorista'
    : isNationalPrice.value
      ? (isBsPriceList.value ? 'Precio Nacional (Bs)' : 'Divisa Nacional (USD)')
      : (isBsPriceList.value ? 'Precio Local (Bs)' : 'Divisa Local (USD)');

  let invoice: Invoice;
  try {
    invoice = await invoicesStore.createInvoice(
      payload,
      Number(selectedCustomerId.value),
      Number(monedaId),
      customerName,
      customerDocument,
      priceListLabel,
      discountAmount.value,
    );
  } catch (err) {
    feedbackMessage.value = resolveApiErrorMessage(err, t('invoices.submitError'));
    return;
  }

  const bankPayments = payments.value.filter(
    (payment): payment is RegisteredPayment & { cuentaBancariaId: string } =>
      payment.cuentaBancariaId !== null,
  );
  const creditResults = await Promise.all(
    bankPayments.map((payment) => creditCuentaBancaria(payment.cuentaBancariaId, payment.amount)),
  );

  feedbackMessage.value = creditResults.every(Boolean)
    ? t('invoices.issued', { number: invoice.number })
    : t('invoices.payments.cuentaCreditError', { number: invoice.number });

  issuedInvoice.value = invoice;

  invoicesStore.clearCart();
  payments.value = [];
  searchTerm.value = '';
  clearCustomerSelection();
  invoiceNotes.value = '';
  fleteEnabled.value = false;
  fleteAmount.value = null;
  discountInput.value = '';
  selectedVendedorId.value = null;
  isCommissionSplit.value = false;
  selectedVendedorSecundarioId.value = null;
  porcentajeVendedor1.value = 50;
  porcentajeVendedor2.value = 50;

  const dispatchSucursalId =
    selectedWarehouseId.value === null
      ? null
      : (warehouseStore.getWarehouseById(String(selectedWarehouseId.value))?.sucursalId ?? null);
  invoicesStore.fetchProximoCorrelativo(dispatchSucursalId, isNationalPrice.value);

  if (loadedPreliminarId.value !== null) {
    const id = loadedPreliminarId.value;
    loadedPreliminarId.value = null;
    preliminaresStore.remove(id).catch(() => undefined);
  }
}

// =========================================================================
// Documentos preliminares
// =========================================================================
const loadedPreliminarId = ref<number | null>(null);
const isSavingPreliminar = ref<boolean>(false);
const showPreliminarPicker = ref<boolean>(false);
const preliminarNotices = ref<string[]>([]);

const canSavePreliminar = computed<boolean>(() => !invoicesStore.isEmpty);
const preliminarPreview = ref<Invoice | null>(null);

function openPreliminarPrint(): void {
  if (invoicesStore.isEmpty) {
    return;
  }
  const hasCustomPrice = invoicesStore.cart.some((item) => item.esPrecioModificado);
  const priceListLabel = hasCustomPrice
    ? 'Precio Mayorista'
    : isNationalPrice.value
      ? (isBsPriceList.value ? 'Precio Nacional (Bs)' : 'Divisa Nacional (USD)')
      : (isBsPriceList.value ? 'Precio Local (Bs)' : 'Divisa Local (USD)');

  preliminarPreview.value = {
    id: 'preliminar',
    sucursalId: authStore.user?.sucursalId ?? 0,
    number: '',
    numeroControl: null,
    customerName: selectedCustomerOption.value?.name ?? t('preliminares.noCustomer'),
    customerDocument: selectedCustomerOption.value?.document ?? '',
    issuedAt: new Date().toISOString().slice(0, 10),
    issuedTime: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
    issuedByName: authStore.user?.nombreCompleto || authStore.user?.username,
    priceListLabel,
    currencyCode: INVOICE_CURRENCY_CODE,
    exchangeRate: currentBankRate.value,
    paymentCondition: paymentCondition.value,
    details: invoicesStore.cart.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: roundCurrency(item.unitPrice),
      subtotal: roundCurrency(item.subtotal),
      permiteDecimales: item.permiteDecimales,
    })),
    payments: [],
    subtotal: taxableBase.value,
    discountAmount: discountAmount.value,
    taxAmount: taxAmount.value,
    igtfAmount: igtfAmount.value,
    total: grandTotal.value,
    notes: invoiceNotes.value.trim(),
    status: 'ISSUED',
    voidReason: null,
  };
}

function buildPreliminarPayload(): InvoicePreliminarPayload {
  return {
    clienteId: selectedCustomerId.value === '' ? null : Number(selectedCustomerId.value),
    monedaCodigo: INVOICE_CURRENCY_CODE,
    condicionPago: paymentCondition.value,
    diasCredito: termsDays.value,
    almacenId: selectedWarehouseId.value,
    notas: invoiceNotes.value,
    aplicaIva: applyVat.value,
    aplicaIgtf: applyIgtf.value,
    items: invoicesStore.cart.map((item) => ({
      productoId: Number(item.productId),
      cantidad: item.quantity,
    })),
  };
}

async function savePreliminar(): Promise<void> {
  if (!canSavePreliminar.value || isSavingPreliminar.value) {
    return;
  }

  isSavingPreliminar.value = true;
  try {
    const label = selectedCustomerOption.value?.name ?? t('preliminares.noCustomer');
    loadedPreliminarId.value = await preliminaresStore.save(
      'FACTURA',
      label,
      buildPreliminarPayload(),
      loadedPreliminarId.value,
    );
    feedbackMessage.value = t('preliminares.saved');
  } catch (err) {
    feedbackMessage.value = resolveApiErrorMessage(err, t('preliminares.saveError'));
  } finally {
    isSavingPreliminar.value = false;
  }
}

const isConfirmingOverwrite = ref<boolean>(false);

function openPreliminarPicker(): void {
  if (invoicesStore.isEmpty) {
    showPreliminarPicker.value = true;
    return;
  }
  isConfirmingOverwrite.value = true;
}

function confirmOverwrite(): void {
  isConfirmingOverwrite.value = false;
  showPreliminarPicker.value = true;
}

async function loadPreliminar(summary: PreliminarSummary): Promise<void> {
  showPreliminarPicker.value = false;
  preliminarNotices.value = [];

  let payload: InvoicePreliminarPayload;
  try {
    payload = await preliminaresStore.fetchOne<InvoicePreliminarPayload>(summary.id);
  } catch (err) {
    feedbackMessage.value = resolveApiErrorMessage(err, t('preliminares.loadError'));
    return;
  }

  loadedPreliminarId.value = summary.id;
  applyPreliminarHeader(payload);
  applyPreliminarItems(payload.items);

  feedbackMessage.value = t('preliminares.loaded');
}

function applyPreliminarHeader(payload: InvoicePreliminarPayload): void {
  paymentCondition.value = payload.condicionPago;
  termsDays.value = payload.diasCredito;
  invoiceNotes.value = payload.notas;
  applyVat.value = payload.aplicaIva;
  applyIgtf.value = payload.aplicaIgtf;

  const customer =
    payload.clienteId === null
      ? undefined
      : customerOptions.value.find((option) => option.id === String(payload.clienteId));
  if (customer) {
    selectCustomer(customer);
  } else {
    clearCustomerSelection();
    if (payload.clienteId !== null) {
      preliminarNotices.value.push(t('preliminares.adjusted.missingCustomer'));
    }
  }

  const warehouse = availableWarehouses.value.find(
    (item) => Number(item.id) === payload.almacenId,
  );
  if (warehouse) {
    selectedWarehouseId.value = Number(warehouse.id);
  } else if (payload.almacenId !== null) {
    preliminarNotices.value.push(t('preliminares.adjusted.missingWarehouse'));
  }
}

function applyPreliminarItems(items: InvoicePreliminarPayload['items']): void {
  invoicesStore.clearCart();
  const unrestricted = authStore.hasPermission('invoices.sellWithoutStock');

  for (const item of items) {
    const productId = String(item.productoId);
    const product = catalogProducts.value.find((candidate) => candidate.id === productId);

    if (!product) {
      preliminarNotices.value.push(
        t('preliminares.adjusted.missingProduct', { name: `#${item.productoId}` }),
      );
      continue;
    }
    if (product.price <= 0) {
      preliminarNotices.value.push(
        t('preliminares.adjusted.noPrice', { name: product.name }),
      );
      continue;
    }
    if (product.currentStock <= 0 && !unrestricted) {
      preliminarNotices.value.push(
        t('preliminares.adjusted.noStock', { name: product.name }),
      );
      continue;
    }

    const quantity = unrestricted
      ? item.cantidad
      : Math.min(item.cantidad, product.currentStock);
    if (quantity < item.cantidad) {
      preliminarNotices.value.push(
        t('preliminares.adjusted.clamped', {
          name: product.name,
          requested: item.cantidad,
          available: quantity,
        }),
      );
    }

    if (invoicesStore.addProduct(product)) {
      invoicesStore.updateQuantity(productId, quantity);
    }
  }
}
</script>

<template>
  <!-- =========================================================================
       0. CAJERO LOGIN / INICIO DE TURNO OVERLAY (POS LOCK SCREEN)
       ========================================================================= -->
  <div
    v-if="!isCashierUnlocked"
    class="min-h-[85vh] flex flex-col items-center justify-center p-4"
  >
    <div class="w-full max-w-md rounded-3xl bg-[#081827] border border-navy-light/60 p-6 sm:p-8 text-white shadow-2xl backdrop-blur-xl">
      
      <!-- POS Logo & Badge -->
      <div class="text-center mb-6">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand to-blue-600 text-3xl shadow-lg mb-3">
          🖥️
        </div>
        <h1 class="text-xl font-black tracking-wider text-white uppercase">ERP BUSINESS POS TERMINAL</h1>
        <p class="text-xs text-blue-300 mt-1">Apertura de Turno &bull; Autenticación de Cajero</p>
        <div class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-950/80 border border-blue-500/40 px-3 py-0.5 text-[11px] text-blue-200 font-mono">
          <span>🏪 {{ companyInfo?.nombre || 'Sede Principal' }}</span>
        </div>
      </div>

      <!-- Error Alert -->
      <div
        v-if="cashierUnlockError"
        class="mb-4 rounded-xl bg-rose-900/60 border border-rose-500/60 p-3 text-xs font-bold text-rose-200 flex items-center gap-2"
      >
        <span>⚠️</span>
        <span>{{ cashierUnlockError }}</span>
      </div>

      <!-- Form -->
      <form class="space-y-4" @submit.prevent="handleUnlockCashier">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">
            Usuario / Cajero:
          </label>
          <input
            v-model="cashierUsername"
            type="text"
            placeholder="Ej: cajero o admin"
            class="w-full rounded-xl border border-navy-light bg-[#0b2136] px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 shadow-inner"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">
            Contraseña del Cajero:
          </label>
          <input
            ref="cashierPasswordInput"
            v-model="cashierPassword"
            type="password"
            placeholder="••••••••"
            autofocus
            class="w-full rounded-xl border border-navy-light bg-[#0b2136] px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 shadow-inner tracking-widest"
            required
          />
        </div>

        <button
          type="submit"
          :disabled="isVerifyingCashier"
          class="w-full rounded-xl bg-gradient-to-r from-brand to-blue-600 hover:from-brand-hover hover:to-blue-500 px-4 py-3 text-sm font-black uppercase text-white shadow-xl transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <SpinnerIcon v-if="isVerifyingCashier" />
          <span v-else>🔐</span>
          <span>{{ isVerifyingCashier ? 'Verificando...' : 'Iniciar Turno / Entrar al POS' }}</span>
        </button>

        <div class="pt-3 border-t border-navy-light/40 flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            class="hover:text-white transition flex items-center gap-1 cursor-pointer"
            @click="handleClosePos"
          >
            <span>←</span>
            <span>Volver al Área Administrativa</span>
          </button>

          <span class="text-[11px] font-mono text-slate-500">v0.1.0 POS</span>
        </div>
      </form>

    </div>
  </div>

  <div
    v-else
    :class="[
      'font-sans transition-all duration-150',
      isFullscreen
        ? 'fixed inset-0 z-50 overflow-y-auto bg-[#071726] p-2 sm:p-4 pb-28'
        : 'mx-auto max-w-[1700px] pb-24'
    ]"
  >
    <!-- POS Window Control & Top Status Bar -->
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#081827] px-3 py-1.5 text-xs text-slate-300 border border-navy-light/40 shadow-sm">
      <div class="flex items-center gap-2">
        <span class="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="font-black tracking-wider text-white uppercase text-[11px]">
          🖥️ ERP BUSINESS POS TERMINAL &mdash; CAJA DE VENTAS
        </span>
        <span class="hidden sm:inline-block text-[10px] bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded font-mono">
          {{ companyInfo?.nombre || 'Sede Principal' }}
        </span>
      </div>

      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- Volver a Área Administrativa -->
        <button
          type="button"
          class="flex items-center gap-1 rounded-lg bg-navy hover:bg-navy-light border border-navy-light/60 px-2.5 py-1 text-xs font-bold text-slate-200 hover:text-white transition cursor-pointer"
          title="Regresar al Tablero y Menús Administrativos"
          @click="handleClosePos"
        >
          <span>🏢</span>
          <span class="hidden md:inline">Área Administrativa</span>
        </button>

        <!-- Cajero Activo & Clave -->
        <button
          type="button"
          class="flex items-center gap-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 px-2.5 py-1 text-xs font-bold text-blue-200 hover:text-white transition cursor-pointer"
          title="Cambiar Cajero o Actualizar Tasa del Día [F5]"
          @click="showCashierRateModal = true"
        >
          <span>👤</span>
          <span class="hidden sm:inline">Cajero:</span>
          <strong class="text-white">{{ activeCashierName }}</strong>
        </button>

        <!-- Tasa del Día -->
        <button
          type="button"
          class="flex items-center gap-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:text-white transition cursor-pointer font-mono"
          title="Cambiar Tasa del Día [F5]"
          @click="showCashierRateModal = true"
        >
          <span>💱</span>
          <span>1 USD = {{ currentBankRate.toLocaleString('es-VE', { minimumFractionDigits: 2 }) }} Bs</span>
        </button>

        <!-- F11 Fullscreen Toggle -->
        <button
          type="button"
          :class="[
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer',
            isFullscreen
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
              : 'bg-navy-light/70 hover:bg-navy-light text-slate-200 hover:text-white'
          ]"
          :title="isFullscreen ? 'Minimizar / Salir de pantalla completa [F11]' : 'Expandir a pantalla completa [F11]'"
          @click="toggleFullscreen"
        >
          <span v-if="isFullscreen">🗗 Minimizar [F11]</span>
          <span v-else>⛶ Pantalla Completa [F11]</span>
        </button>

        <!-- Bloquear Turno -->
        <button
          type="button"
          class="flex items-center gap-1 rounded-lg bg-navy hover:bg-navy-light border border-navy-light/60 px-2 py-1 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
          title="Bloquear Terminal POS (Ctrl+L)"
          @click="handleLockCashier"
        >
          <span>🔒</span>
        </button>

        <!-- Cerrar POS -->
        <button
          type="button"
          class="flex items-center gap-1 rounded-lg bg-rose-900/60 hover:bg-rose-700 px-2.5 py-1 text-xs font-bold text-rose-200 hover:text-white transition cursor-pointer"
          title="Cerrar terminal de ventas y volver al inicio"
          @click="handleClosePos"
        >
          <span>✕</span>
          <span class="hidden sm:inline">Cerrar POS</span>
        </button>
      </div>
    </div>

    <!-- =========================================================================
         1. COMPACT POS TERMINAL STATUS BAR (ERP BUSINESS PALETTE)
         ========================================================================= -->
    <header class="mb-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f2942] via-navy to-[#18456d] p-3 sm:p-4 text-white shadow-xl border border-navy-light/60">
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-stretch">
        
        <!-- LEFT: Customer Information Card (Mistellar POS Style) -->
        <div class="flex items-start gap-3 lg:col-span-4 bg-navy/90 p-3 rounded-xl border border-navy-light/60 backdrop-blur-xs flex-col justify-between">
          <div class="flex items-start gap-3 w-full">
            <!-- POS Customer Avatar Icon -->
            <div class="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-navy-light text-2xl shadow-inner border border-white/20 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-7 sm:w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span v-if="customerAnticipoDisponible > 0" class="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] font-bold text-white items-center justify-center">$</span>
              </span>
            </div>

            <!-- Customer Data details -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1">
                <div class="text-[11px] font-medium text-slate-300">
                  <span>Customer Code: </span>
                  <span class="font-mono font-bold text-cyan-300">
                    {{ selectedCustomerOption ? selectedCustomerOption.documentNumber : '00000000' }}
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="rounded bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white transition shadow-xs cursor-pointer"
                    title="Registrar cliente rápido [F3]"
                    @click="showQuickCustomerModal = true"
                  >
                    + Rápido [F3]
                  </button>
                  <button
                    type="button"
                    class="rounded bg-brand hover:bg-brand-hover px-2 py-0.5 text-[10px] font-semibold text-white transition shadow-xs cursor-pointer"
                    title="Buscar clientes en el catálogo [F4]"
                    @click="showCustomersModal = true"
                  >
                    {{ selectedCustomerOption ? 'Cambiar [F4]' : 'Buscar [F4]' }}
                  </button>
                </div>
              </div>

              <div class="mt-0.5">
                <span class="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Customer Name:</span>
                <div class="truncate text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                  {{ selectedCustomerOption ? selectedCustomerOption.name : 'CLIENTE DE CONTADO' }}
                </div>
              </div>

              <div class="mt-0.5 text-[11px] text-blue-100/80 truncate">
                <span class="text-slate-400">Customer Address: </span>
                <span>{{ selectedCustomerFull?.notes || selectedCustomerFull?.phone || selectedCustomerOption?.document || 'Mostrador / Ventas' }}</span>
              </div>
            </div>
          </div>

          <!-- Anticipo Indicator if available -->
          <div
            v-if="customerAnticipoDisponible > 0"
            class="w-full mt-1 flex items-center justify-between rounded-lg bg-emerald-950/80 px-2 py-1 border border-emerald-500/40 text-[11px]"
          >
            <span class="text-emerald-300 font-medium flex items-center gap-1">
              💰 Anticipo Disponible: <strong class="font-mono font-bold text-emerald-200">${{ customerAnticipoDisponible.toFixed(2) }}</strong>
            </span>
            <button
              type="button"
              class="rounded bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white transition shadow-xs cursor-pointer"
              @click="handleApplyAnticipo"
            >
              Aplicar
            </button>
          </div>
        </div>

        <!-- CENTER: Terminal Receipt Nº, Tasa Ticker & Almacén -->
        <div class="flex flex-col justify-between gap-2 lg:col-span-4 bg-navy/90 p-3 rounded-xl border border-navy-light/60">
          <div class="flex items-center justify-between gap-2">
            <div class="flex flex-col">
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Receipt Nº:</span>
              <span
                :class="[
                  'font-mono text-xl sm:text-2xl font-black tracking-wider shadow-inner truncate',
                  invoicesStore.isLoadingCorrelativo
                    ? 'animate-pulse text-slate-500'
                    : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.3)]'
                ]"
              >
                {{ invoicesStore.isLoadingCorrelativo ? '-------' : invoicesStore.proximoCorrelativo }}
              </span>
            </div>

            <!-- Tasa Ticker -->
            <div class="text-right">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tasa BCV:</span>
              <div class="font-mono text-xs sm:text-sm bg-[#0b1c2b] border border-amber-500/40 px-2.5 py-1 rounded-lg text-slate-200 whitespace-nowrap font-medium">
                1 $ = <span class="font-bold text-amber-300">{{ currentBankRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span> Bs.
              </div>
            </div>
          </div>

          <!-- Almacén & Tarifas Badges -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-navy-light/40">
            <div class="flex items-center gap-1.5 text-xs text-slate-200">
              <span class="text-slate-300 text-[11px] font-bold whitespace-nowrap">🏪 Almacén:</span>
              <select
                v-if="availableWarehouses.length > 0"
                v-model.number="selectedWarehouseId"
                class="rounded-md bg-[#0b243b] border border-blue-400/50 px-2 py-1 text-xs font-bold text-white outline-none hover:border-brand focus:border-brand focus:ring-2 focus:ring-brand/30 cursor-pointer shadow-xs max-w-[150px] truncate"
              >
                <option v-for="warehouse in availableWarehouses" :key="warehouse.id" :value="Number(warehouse.id)">
                  {{ warehouse.name }}
                </option>
              </select>
              <span v-else class="font-semibold text-blue-200 text-xs">
                Cargando almacenes...
              </span>
            </div>

            <!-- Rate Badges -->
            <div class="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                :class="[
                  'rounded px-2 py-0.5 font-semibold transition cursor-pointer',
                  isNationalPrice ? 'bg-brand text-white shadow-xs' : 'bg-navy-light/60 text-slate-200 hover:bg-navy-light'
                ]"
                @click="canUseNationalPrice && (isNationalPrice = !isNationalPrice)"
              >
                {{ isNationalPrice ? '🌐 Nac' : '🏪 Local' }}
              </button>

              <button
                type="button"
                :class="[
                  'rounded px-2 py-0.5 font-semibold transition cursor-pointer',
                  isBsPriceList ? 'bg-brand text-white shadow-xs' : 'bg-navy-light/60 text-slate-200 hover:bg-navy-light'
                ]"
                @click="isBsPriceList = !isBsPriceList"
              >
                {{ isBsPriceList ? 'Bs' : 'USD' }}
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT: Mistellar-style Totals Box with Multi-Currency Conversions & Quick Tax Toggle -->
        <div class="lg:col-span-4 rounded-xl bg-[#0b1c2b] p-3 sm:p-3.5 border-2 border-brand/50 shadow-[inset_0_0_20px_rgba(0,0,0,0.85)] flex flex-col justify-between">
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-slate-400 font-medium">Subtotal:</span>
              <span class="text-slate-100 font-bold text-sm">${{ taxableBase.toFixed(2) }}</span>
            </div>

            <!-- Tax / IVA Row with Direct 1-Click Toggle -->
            <div class="flex items-center justify-between text-xs font-mono">
              <div class="flex items-center gap-1.5">
                <span class="text-slate-400 font-medium">Tax / IVA (16%):</span>
                <button
                  type="button"
                  :class="[
                    'rounded px-1.5 py-0.2 text-[10px] font-black transition cursor-pointer',
                    applyVat
                      ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-500'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                  ]"
                  :title="applyVat ? 'Desactivar IVA (16%)' : 'Activar IVA (16%)'"
                  @click="applyVat = !applyVat"
                >
                  {{ applyVat ? 'ON' : 'OFF' }}
                </button>
              </div>
              <span :class="['font-bold text-sm', applyVat ? 'text-slate-100' : 'text-slate-500 line-through']">
                ${{ taxAmount.toFixed(2) }}
              </span>
            </div>
          </div>

          <!-- Giant LCD Total Highlight -->
          <div class="my-1 flex items-baseline justify-between border-t border-slate-800/80 pt-1">
            <span class="text-xs font-black uppercase tracking-widest text-cyan-400">Total:</span>
            <div class="font-mono text-3xl sm:text-4xl font-black tracking-tight text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
              ${{ grandTotal.toFixed(2) }}
            </div>
          </div>

          <!-- Multi-Currency Conversions List -->
          <div class="space-y-0.5 border-t border-slate-800/80 pt-1.5 font-mono text-xs">
            <div
              v-for="eq in totalsByCurrency"
              :key="eq.code"
              class="flex items-center justify-between text-[11px]"
            >
              <span class="text-slate-400 font-medium">≈ {{ eq.code }}:</span>
              <span class="font-bold text-amber-300">
                {{ formatMoney(eq.amount, eq.code) }}
              </span>
            </div>
          </div>
        </div>

      </div>
    </header>

    <!-- COMPACT POS SALES CONTROL BAR (Vendedor, Descuento, Flete, Notas) -->
    <div class="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-3 text-xs">
        
        <!-- Vendedor Selector -->
        <div class="flex items-center gap-2 min-w-[260px] flex-1">
          <span class="text-slate-700 font-bold flex items-center gap-1 whitespace-nowrap">
            <span>👤</span> Vendedor:
          </span>
          <select
            v-model.number="selectedVendedorId"
            class="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-brand focus:bg-white shadow-xs cursor-pointer"
          >
            <option :value="null">-- Seleccionar Vendedor --</option>
            <optgroup label="🌐 Equipo Redes Sociales">
              <option
                v-for="v in vendedorStore.sortedVendedores.filter((v) => v.canal === 'REDES')"
                :key="v.id"
                :value="Number(v.id)"
              >
                {{ v.nombre }} ({{ v.codigo }})
              </option>
            </optgroup>
            <optgroup label="🏢 Equipo Tienda / Mostrador">
              <option
                v-for="v in vendedorStore.sortedVendedores.filter((v) => v.canal !== 'REDES')"
                :key="v.id"
                :value="Number(v.id)"
              >
                {{ v.nombre }} ({{ v.codigo }})
              </option>
            </optgroup>
          </select>

          <!-- 50/50 Toggle -->
          <label class="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer select-none whitespace-nowrap">
            <input
              id="toggle-split-commission"
              v-model="isCommissionSplit"
              type="checkbox"
              class="h-3.5 w-3.5 rounded text-brand focus:ring-brand"
              @change="handleSplitToggle"
            />
            <span>Comisión 50/50</span>
          </label>
        </div>

        <!-- Secondary Vendedor if split -->
        <div v-if="isCommissionSplit" class="flex items-center gap-2 animate-in fade-in">
          <span class="text-slate-500 font-bold text-[11px] whitespace-nowrap">2do:</span>
          <select
            v-model.number="selectedVendedorSecundarioId"
            class="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none"
          >
            <option :value="null">-- Vendedor 2 --</option>
            <option
              v-for="v in vendedorStore.sortedVendedores.filter((v) => Number(v.id) !== selectedVendedorId)"
              :key="v.id"
              :value="Number(v.id)"
            >
              {{ v.nombre }} ({{ v.codigo }})
            </option>
          </select>
          <span class="font-mono text-[11px] font-bold text-brand bg-blue-50 px-1.5 py-0.5 rounded">50/50</span>
        </div>

        <!-- Descuento & Flete & IGTF -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5">
            <label class="text-[11px] font-bold text-slate-600">Desc:</label>
            <input
              v-model="discountInput"
              type="text"
              placeholder="0 ó 10%"
              class="w-20 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs font-bold text-slate-800 outline-none focus:border-brand focus:bg-white shadow-xs text-center"
            />
          </div>

          <div class="flex items-center gap-1.5">
            <label class="text-[11px] font-bold text-slate-600">Flete:</label>
            <ToggleSwitch v-model="fleteEnabled" ariaLabel="Flete" />
            <input
              v-if="fleteEnabled"
              v-model.number="fleteAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="w-20 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs font-bold text-slate-800 outline-none focus:border-brand focus:bg-white shadow-xs text-right"
            />
          </div>

          <div v-if="igtfAvailable" class="flex items-center gap-1.5">
            <label class="text-[11px] font-bold text-slate-600">IGTF:</label>
            <ToggleSwitch v-model="applyIgtf" ariaLabel="IGTF" />
          </div>
        </div>

        <!-- Notas rápidas -->
        <div class="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <span class="text-slate-400 text-xs">📝</span>
          <input
            v-model="invoiceNotes"
            type="text"
            placeholder="Observaciones de la factura (opcional)..."
            class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-brand focus:bg-white"
          />
        </div>

      </div>
    </div>

    <!-- Notices if any -->
    <div
      v-if="preliminarNotices.length > 0"
      class="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200"
    >
      <p class="font-bold">{{ t('preliminares.adjusted.title') }}</p>
      <ul class="mt-1 list-disc space-y-0.5 pl-4">
        <li v-for="(notice, index) in preliminarNotices" :key="index">{{ notice }}</li>
      </ul>
    </div>

    <!-- Stock / submission feedback bar -->
    <div
      v-if="feedbackMessage"
      :class="[
        'mb-3 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium shadow-xs border transition-all',
        feedbackMessage.includes('emitida') || feedbackMessage.includes('guardado') || feedbackMessage.includes('cargado')
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-amber-50 text-amber-800 border-amber-200'
      ]"
    >
      <span>{{ feedbackMessage }}</span>
      <button type="button" class="text-xs font-bold underline opacity-70 hover:opacity-100 cursor-pointer" @click="feedbackMessage = ''">Cerrar</button>
    </div>

    <!-- =========================================================================
         2. FULL-WIDTH POS CART & PRODUCT SEARCH TABLE (100% WIDE)
         ========================================================================= -->
    <section class="w-full space-y-3">
      
      <!-- Fast Barcode / Search Input Bar -->
      <div class="relative">
        <div class="relative flex items-center">
          <span class="absolute left-3.5 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>

          <input
            id="product-search"
            v-model="searchTerm"
            type="text"
            autocomplete="off"
            :placeholder="'🔍 Buscar producto por código, nombre, marca o referencia... (F2: Catálogo)'"
            class="w-full rounded-2xl border-2 border-slate-300 bg-white py-3 pl-11 pr-28 text-sm font-medium shadow-xs outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
            @keydown.enter.prevent="handleSearchEnter"
            @keydown.down.prevent="navigateSearch(1)"
            @keydown.up.prevent="navigateSearch(-1)"
            @keydown.esc="searchTerm = ''"
          />

          <button
            type="button"
            class="absolute right-2.5 rounded-xl bg-navy hover:bg-navy-light px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            @click="showInventoryModal = true"
          >
            Catálogo [F2]
          </button>
        </div>

        <!-- Live Search Results Dropdown -->
        <ul
          v-if="searchTerm.trim().length > 0"
          class="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl divide-y divide-slate-100"
        >
          <li
            v-for="(product, idx) in filteredProducts"
            :key="product.id"
            :class="[
              'flex cursor-pointer items-center justify-between px-4 py-3 transition',
              idx === activeSearchIndex ? 'bg-blue-50 border-l-4 border-brand font-semibold' : 'hover:bg-slate-50'
            ]"
            @click="handleAddProduct(product)"
          >
            <div class="flex-1 pr-4">
              <p class="text-sm font-bold text-slate-800">{{ product.name }}</p>
              <div class="flex flex-wrap items-center gap-2 mt-0.5">
                <span class="font-mono text-xs text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">{{ product.code }}</span>
                <span v-if="(product as any).referencia" class="text-xs text-slate-400">Ref: {{ (product as any).referencia }}</span>
                <span v-if="(product as any).marca" class="text-xs text-slate-400">Marca: {{ (product as any).marca }}</span>
              </div>
            </div>
            <div class="text-right whitespace-nowrap">
              <p class="font-mono text-base font-black text-navy">
                {{ displayMoney(product.price) }}
              </p>
              <p
                :class="[
                  'text-xs font-bold',
                  product.currentStock > 0 ? 'text-emerald-600' : 'text-rose-500',
                ]"
              >
                {{ product.currentStock > 0 ? `Stock: ${product.currentStock}` : 'Sin Stock' }}
              </p>
            </div>
          </li>

          <li
            v-if="filteredProducts.length === 0"
            class="px-4 py-4 text-center text-sm text-slate-400 font-medium"
          >
            No se encontraron productos coincidentes con "{{ searchTerm }}"
          </li>
        </ul>
      </div>

      <!-- Full-Width POS Cart Table Grid -->
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <!-- POS Table Header (ERP Business Navy Palette) -->
            <thead>
              <tr class="bg-gradient-to-r from-[#0f2942] via-navy to-[#18456d] text-[11px] font-black uppercase tracking-wider text-white">
                <th class="w-14 px-4 py-3.5 text-center">LN</th>
                <th class="w-36 px-4 py-3.5">CÓDIGO</th>
                <th class="px-5 py-3.5">DESCRIPCIÓN</th>
                <th class="w-32 px-4 py-3.5 text-center">CANT.</th>
                <th class="w-36 px-4 py-3.5 text-right">PRECIO UNIT</th>
                <th class="w-36 px-4 py-3.5 text-right">SUBTOTAL</th>
                <th class="w-16 px-4 py-3.5 text-center"></th>
              </tr>
            </thead>

            <!-- POS Table Body -->
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr
                v-for="(item, index) in invoicesStore.cart"
                :key="item.productId"
                class="hover:bg-bone/70 transition-colors"
              >
                <!-- LN -->
                <td class="px-4 py-3 text-center font-mono text-xs font-bold text-slate-400">
                  {{ index + 1 }}
                </td>

                <!-- Code -->
                <td class="px-4 py-3 font-mono text-xs font-bold text-navy">
                  {{ item.productId }}
                </td>

                <!-- Description -->
                <td class="px-5 py-3">
                  <div class="font-bold text-slate-800 text-sm">{{ item.name }}</div>
                  <div v-if="item.esPrecioModificado" class="mt-0.5">
                    <span class="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-brand">
                      🏷️ Precio Mayorista Especial
                    </span>
                  </div>
                </td>

                <!-- Quantity -->
                <td class="px-4 py-3 text-center">
                  <input
                    :id="`quantity-${item.productId}`"
                    type="number"
                    :min="item.permiteDecimales ? 0.01 : 1"
                    :step="item.permiteDecimales ? 0.01 : 1"
                    :max="invoicesStore.getStockLimit(item.productId)"
                    :value="item.quantity"
                    :aria-label="`${t('invoices.cart.quantity')} - ${item.name}`"
                    class="w-20 rounded-lg border-2 border-slate-300 bg-slate-50 px-2 py-1 text-center font-mono text-sm font-black text-slate-800 outline-none transition focus:border-brand focus:bg-white"
                    @change="handleQuantityInput(item.productId, $event)"
                  />
                </td>

                <!-- Price -->
                <td class="px-4 py-3 text-right">
                  <template v-if="canEditPrice">
                    <div class="flex items-center justify-end gap-1">
                      <span class="text-xs font-bold text-slate-400">$</span>
                      <input
                        :id="`price-${item.productId}`"
                        type="number"
                        step="0.01"
                        min="0"
                        :value="item.unitPrice"
                        class="w-24 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-right font-mono text-xs font-bold text-slate-800 outline-none transition focus:border-brand focus:bg-white"
                        @change="handlePriceInput(item.productId, $event)"
                      />
                      <button
                        v-if="item.esPrecioModificado"
                        type="button"
                        class="rounded p-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        title="Restablecer precio de lista"
                        @click="handleResetPrice(item.productId)"
                      >
                        ↺
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <span class="font-mono text-sm font-bold text-slate-700">{{ displayMoney(item.unitPrice) }}</span>
                  </template>
                </td>

                <!-- Subtotal -->
                <td class="px-4 py-3 text-right font-mono text-base font-black text-slate-900">
                  {{ displayMoney(item.subtotal) }}
                </td>

                <!-- Delete -->
                <td class="px-4 py-3 text-center">
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                    title="Eliminar producto"
                    @click="invoicesStore.removeItem(item.productId)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>

              <!-- Empty Cart state -->
              <tr v-if="invoicesStore.isEmpty">
                <td colspan="7" class="px-6 py-16 text-center text-slate-400">
                  <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl text-brand mb-3">
                    🛒
                  </div>
                  <p class="text-sm font-bold text-slate-600 uppercase tracking-wide">Terminal listo para facturar</p>
                  <p class="text-xs text-slate-400 mt-1">Busca un producto por nombre/código o presiona <strong>F2</strong> para abrir el inventario.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </section>

    <!-- =========================================================================
         3. BOTTOM POS TOUCH FUNCTION BAR (ERP BUSINESS THEME)
         ========================================================================= -->
    <footer class="fixed bottom-0 left-0 right-0 z-30 bg-[#0f2942]/95 border-t border-navy-light p-2.5 backdrop-blur-md shadow-2xl">
      <div class="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-2">
        
        <!-- Quick Touch Buttons (F2 - F10) -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- F2 Buscar Producto -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl bg-navy border border-navy-light/70 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-navy-light hover:text-white transition active:scale-95 shadow-xs"
            @click="showInventoryModal = true"
          >
            <span>🔍</span>
            <span>Buscar Prod [F2]</span>
          </button>

          <!-- F3 Registro Rápido Cliente -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl bg-emerald-700/80 border border-emerald-500/60 px-3 py-2 text-xs font-bold text-emerald-100 hover:bg-emerald-600 hover:text-white transition active:scale-95 shadow-xs"
            @click="showQuickCustomerModal = true"
          >
            <span>➕</span>
            <span>+ Cliente [F3]</span>
          </button>

          <!-- F4 Cliente -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl bg-navy border border-navy-light/70 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-navy-light hover:text-white transition active:scale-95 shadow-xs cursor-pointer"
            @click="showCustomersModal = true"
          >
            <span>👤</span>
            <span>Buscar Cli [F4]</span>
          </button>

          <!-- F5 Tasa / Clave Cajero -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 border border-blue-400/60 px-3 py-2 text-xs font-bold text-white hover:from-blue-600 hover:to-indigo-600 transition active:scale-95 shadow-xs cursor-pointer"
            title="Cambiar tasa del día o contraseña/cajero activo [F5]"
            @click="showCashierRateModal = true"
          >
            <span>💱</span>
            <span>Cambiar Tasa [F5]</span>
          </button>

          <!-- F6 Guardar Preliminar -->
          <button
            type="button"
            :disabled="!canSavePreliminar || isSavingPreliminar"
            class="flex items-center gap-1.5 rounded-xl bg-navy border border-navy-light/70 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-navy-light hover:text-white disabled:opacity-40 transition active:scale-95 shadow-xs"
            @click="savePreliminar"
          >
            <SpinnerIcon v-if="isSavingPreliminar" />
            <span v-else>💾</span>
            <span>Guardar Preliminar [F6]</span>
          </button>

          <!-- F7 Cargar Preliminar -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl bg-navy border border-navy-light/70 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-navy-light hover:text-white transition active:scale-95 shadow-xs"
            @click="openPreliminarPicker"
          >
            <span>📂</span>
            <span>Cargar Preliminar [F7]</span>
          </button>

          <!-- F8 Imprimir Preliminar -->
          <button
            type="button"
            :disabled="invoicesStore.isEmpty"
            class="flex items-center gap-1.5 rounded-xl bg-navy border border-navy-light/70 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-navy-light hover:text-white disabled:opacity-40 transition active:scale-95 shadow-xs"
            @click="openPreliminarPrint"
          >
            <span>🖨️</span>
            <span>Imprimir Cotización [F8]</span>
          </button>

          <!-- F9 Inventario -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl bg-navy border border-navy-light/70 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-navy-light hover:text-white transition active:scale-95 shadow-xs"
            @click="showInventoryModal = true"
          >
            <span>📋</span>
            <span>Stock [F9]</span>
          </button>

          <!-- F10 Reimpresión -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl bg-navy border border-navy-light/70 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-navy-light hover:text-white transition active:scale-95 shadow-xs"
            @click="showReprintModal = true"
          >
            <span>🔄</span>
            <span>Reimpresión [F10]</span>
          </button>

          <!-- F11 Pantalla Completa -->
          <button
            type="button"
            :class="[
              'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition active:scale-95 shadow-xs',
              isFullscreen
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-navy border-navy-light/70 text-slate-100 hover:bg-navy-light hover:text-white'
            ]"
            @click="toggleFullscreen"
          >
            <span>{{ isFullscreen ? '🗗' : '⛶' }}</span>
            <span>{{ isFullscreen ? 'Minimizar [F11]' : 'Pantalla Completa [F11]' }}</span>
          </button>
        </div>

        <!-- Right Quick Trigger Siguiente / Totalizar -->
        <button
          type="button"
          :disabled="invoicesStore.isEmpty"
          class="rounded-xl bg-brand hover:bg-brand-hover disabled:bg-slate-700 disabled:text-slate-500 px-5 py-2 text-xs font-black uppercase text-white shadow-lg transition active:scale-95 flex items-center gap-1.5 shrink-0"
          @click="openPaymentModal"
        >
          <span>💳 Siguiente: Totalizar [F12] →</span>
        </button>

      </div>
    </footer>

    <!-- =========================================================================
         4. MODALS & DIALOGS
         ========================================================================= -->
    <!-- Modal de Totalización y Pagos POS -->
    <InvoicePaymentModal
      :show="showPaymentModal"
      :customer-name="selectedCustomerOption?.name ?? 'Cliente de Contado'"
      :customer-document="selectedCustomerOption?.document ?? 'V-00000000'"
      :customer-anticipo-disponible="customerAnticipoDisponible"
      :grand-total="grandTotal"
      :subtotal="taxableBase"
      :tax-amount="taxAmount"
      :discount-amount="discountAmount"
      :flete-value="fleteValue"
      :igtf-amount="igtfAmount"
      :apply-vat="applyVat"
      :apply-igtf="applyIgtf"
      :igtf-available="igtfAvailable"
      :current-bank-rate="currentBankRate"
      :totals-by-currency="totalsByCurrency"
      :payments="payments"
      :payment-condition="paymentCondition"
      :terms-days="termsDays"
      :is-submitting="isSubmitting"
      @close="showPaymentModal = false"
      @update:payment-condition="(val) => paymentCondition = val"
      @update:terms-days="(val) => termsDays = val"
      @update:apply-vat="(val) => applyVat = val"
      @update:apply-igtf="(val) => applyIgtf = val"
      @apply-anticipo="handleApplyAnticipo"
      @add-payment="handleAddPaymentFromModal"
      @remove-payment="removePayment"
      @submit="handleSubmit"
    />

    <InvoicePrintPreview
      v-if="preliminarPreview"
      :invoice="preliminarPreview"
      :company="companyInfo"
      preliminary
      @close="preliminarPreview = null"
    />

    <ConfirmDialog
      :open="isConfirmingOverwrite"
      :title="t('preliminares.overwriteTitle')"
      :message="t('preliminares.overwriteConfirm')"
      :confirm-label="t('preliminares.overwriteAccept')"
      @confirm="confirmOverwrite"
      @cancel="isConfirmingOverwrite = false"
    />

    <PreliminarPickerDialog
      v-if="showPreliminarPicker"
      type="FACTURA"
      @close="showPreliminarPicker = false"
      @select="loadPreliminar"
    />

    <InvoicePrintPreview
      v-if="issuedInvoice"
      :invoice="issuedInvoice"
      :company="companyInfo"
      @close="closePrintPreview"
    />

    <!-- POS Modals -->
    <InvoiceQuickCustomerModal
      :show="showQuickCustomerModal"
      @close="showQuickCustomerModal = false"
      @select-customer="onSelectCustomerFromModal"
    />

    <InvoiceReprintModal
      :show="showReprintModal"
      @close="showReprintModal = false"
      @reprint="onReprintFromModal"
    />

    <InvoiceInventoryModal
      :show="showInventoryModal"
      :selected-warehouse-id="selectedWarehouseId"
      :unrestricted-stock="authStore.hasPermission('invoices.sellWithoutStock')"
      @close="showInventoryModal = false"
      @add-product="onAddProductFromModal"
      @update:selected-warehouse-id="(id) => selectedWarehouseId = id"
    />

    <InvoiceCustomersModal
      :show="showCustomersModal"
      :selected-customer-id="selectedCustomerId"
      @close="showCustomersModal = false"
      @select-customer="onSelectCustomerFromModal"
    />

    <!-- Modal de Cajero & Cambio de Tasa -->
    <InvoiceCashierRateModal
      :show="showCashierRateModal"
      :current-cashier-name="activeCashierName"
      @close="showCashierRateModal = false"
      @rate-updated="handleRateUpdated"
      @cashier-authenticated="(name) => { activeCashierName = name; isCashierUnlocked = true; }"
    />
  </div>
</template>
