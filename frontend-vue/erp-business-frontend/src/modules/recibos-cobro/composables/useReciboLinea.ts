import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';

import { useI18n } from 'vue-i18n';

import { useAuthStore } from '@/modules/auth/auth.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useExchangeRatesStore } from '@/modules/currencies/exchange-rates.store';
import type { Currency } from '@/modules/currencies/interfaces/currency.interface';
import { useBancoStore } from '@/modules/master/bancos/interfaces/banco.store';
import { useCuentaBancariaStore } from '@/modules/master/cuentas-bancarias/interfaces/cuenta-bancaria.store';
import { useMetodoPagoStore } from '@/modules/master/metodos-pago/interfaces/metodo-pago.store';
import { useIgtfStore } from '@/modules/invoices/igtf.store';
import { resolveApiErrorMessage } from '@/utils/api-error';
import type { CreateReciboPayload, CuentaPendiente, ReciboCobro } from '../interfaces/recibo-cobro.interface';
import { useRecibosCobroStore } from '../recibos-cobro.store';

/**
 * One payment line's worth of state and logic: moneda, tasa de cambio,
 * método de pago + cuenta bancaria, cuentas pendientes filtradas por moneda,
 * IGTF automático, y el submit real via recibosStore.registerRecibo().
 *
 * Extracted from RecibosCobroCreateView.vue so PaymentMethodsModal.vue (the
 * multi-line "Formas de Pago" modal) can reuse the exact same business logic
 * instead of a parallel implementation. `clienteId` is a Ref because both
 * callers resolve it differently (a local selector in the standalone view,
 * the already-selected ficha client in the modal).
 */
export function useReciboLinea(clienteId: Ref<string>) {
  const { t } = useI18n();
  const authStore = useAuthStore();
  const recibosStore = useRecibosCobroStore();
  const currenciesStore = useCurrenciesStore();
  const exchangeRatesStore = useExchangeRatesStore();
  const metodoPagoStore = useMetodoPagoStore();
  const cuentaBancariaStore = useCuentaBancariaStore();
  const bancoStore = useBancoStore();
  const igtfStore = useIgtfStore();

  onMounted(() => {
    if (currenciesStore.currencies.length === 0) currenciesStore.fetchCurrencies();
    if (metodoPagoStore.metodoList.length === 0) metodoPagoStore.fetchMetodos();
    if (cuentaBancariaStore.cuentaList.length === 0) cuentaBancariaStore.fetchCuentas();
    if (bancoStore.bancoList.length === 0) bancoStore.fetchBancos();
    if (exchangeRatesStore.rates.length === 0) exchangeRatesStore.fetchRates();
    if (!igtfStore.isLoaded) igtfStore.fetchIgtf();
  });

  // --- Payment currency + open CxC ---
  const monedaPagoCode = ref<Currency['code']>('');
  const monedaPago = computed<Currency | undefined>(() => currenciesStore.findByCode(monedaPagoCode.value));

  const montosAplicados = reactive<Record<string, number>>({});

  async function loadCuentasPendientes(): Promise<void> {
    if (clienteId.value === '') return;
    await recibosStore.fetchCuentasPendientes(Number(clienteId.value));
  }
  watch(clienteId, loadCuentasPendientes, { immediate: true });

  const cuentasFiltradas = computed<CuentaPendiente[]>(() => {
    if (!monedaPago.value) return [];
    return recibosStore.cuentasPendientes.filter(
      (cuenta) => String(cuenta.monedaId) === monedaPago.value?.id,
    );
  });

  watch(monedaPagoCode, () => {
    for (const key of Object.keys(montosAplicados)) delete montosAplicados[key];
  });

  function montoAplicado(cuentaId: string): number {
    return montosAplicados[cuentaId] ?? 0;
  }
  function setMontoAplicado(cuenta: CuentaPendiente, value: number): void {
    montosAplicados[cuenta.id] = Math.max(0, Math.min(value, cuenta.saldoPendiente));
  }

  const montoTotal = computed<number>(() =>
    cuentasFiltradas.value.reduce((sum, cuenta) => sum + montoAplicado(cuenta.id), 0),
  );

  // --- Payment method + bank account ---
  const metodoPagoId = ref<number | null>(null);
  const metodosDisponibles = computed(() =>
    monedaPago.value
      ? metodoPagoStore.activeMetodos.filter((metodo) => String(metodo.monedaId) === monedaPago.value?.id)
      : [],
  );
  const selectedMetodo = computed(() =>
    metodosDisponibles.value.find((metodo) => metodo.id === String(metodoPagoId.value)),
  );
  const isBankAccountRequired = computed<boolean>(() => selectedMetodo.value?.requiereCuentaBancaria ?? false);

  const cuentaBancariaId = ref<string>('');
  const activeCuentas = computed(() => {
    if (!monedaPago.value) return [];
    return cuentaBancariaStore.sortedCuentas.filter(
      (cuenta) => cuenta.activo && String(cuenta.monedaId) === monedaPago.value?.id,
    );
  });
  watch([isBankAccountRequired, activeCuentas], () => {
    if (!isBankAccountRequired.value) {
      cuentaBancariaId.value = '';
      return;
    }
    if (!activeCuentas.value.some((cuenta) => cuenta.id === cuentaBancariaId.value)) {
      cuentaBancariaId.value = activeCuentas.value[0]?.id ?? '';
    }
  });
  function cuentaLabel(cuentaId: string): string {
    const cuenta = cuentaBancariaStore.getCuentaById(cuentaId);
    if (!cuenta) return '';
    const bancoNombre = bancoStore.getBancoById(String(cuenta.bancoId))?.nombre ?? '';
    return `${bancoNombre} — ${cuenta.numeroCuenta}`;
  }

  watch(monedaPagoCode, () => {
    metodoPagoId.value = null;
  });

  // --- Exchange rate: prefilled, editable ---
  const tasaCambio = ref<number>(1);
  watch(monedaPagoCode, (code) => {
    tasaCambio.value = code ? exchangeRatesStore.rateFor(code) || 1 : 1;
  });

  // --- IGTF: auto-applies per company settings when paying in a non-base currency ---
  const aplicaIgtf = computed<boolean>(() => igtfStore.isEnabled && !!monedaPago.value && !monedaPago.value.isBase);
  const igtfMonto = computed<number>(() =>
    aplicaIgtf.value ? Number((montoTotal.value * (igtfStore.ratePercent / 100)).toFixed(2)) : 0,
  );

  const observaciones = ref<string>('');
  const errorMessage = ref<string>('');
  const isSubmitting = ref<boolean>(false);

  const canSubmit = computed<boolean>(
    () =>
      clienteId.value !== '' &&
      monedaPago.value !== undefined &&
      metodoPagoId.value !== null &&
      montoTotal.value > 0 &&
      (!isBankAccountRequired.value || cuentaBancariaId.value !== ''),
  );

  /**
   * Builds the payload and submits a real recibo-cobro. Returns the created
   * ReciboCobro on success, or `null` on failure/guard-not-met — callers
   * check the return value instead of catching, and read `errorMessage` for
   * what to show (this composable owns error-message text, not its callers,
   * so both consumers show the same message without duplicating the catch).
   */
  async function submitLinea(): Promise<ReciboCobro | null> {
    if (!canSubmit.value || !monedaPago.value) {
      return null;
    }

    const detalles = cuentasFiltradas.value
      .filter((cuenta) => montoAplicado(cuenta.id) > 0)
      .map((cuenta) => ({ cxcId: Number(cuenta.id), montoAplicado: montoAplicado(cuenta.id) }));

    const payload: CreateReciboPayload = {
      clienteId: Number(clienteId.value),
      sucursalId: authStore.user?.sucursalId ?? 0,
      formaPago: selectedMetodo.value?.codigo ?? 'BOLIVARES',
      montoTotal: montoTotal.value,
      monedaPagoId: Number(monedaPago.value.id),
      tasaCambio: tasaCambio.value,
      aplicaIgtf: aplicaIgtf.value,
      igtfPorcentaje: aplicaIgtf.value ? igtfStore.ratePercent : 0,
      igtfMonto: igtfMonto.value,
      cuentaBancariaId: isBankAccountRequired.value ? Number(cuentaBancariaId.value) : null,
      usuarioId: authStore.user?.id ?? 0,
      observaciones: observaciones.value,
      detalles,
    };

    errorMessage.value = '';
    isSubmitting.value = true;
    try {
      return await recibosStore.registerRecibo(payload);
    } catch (err) {
      errorMessage.value = resolveApiErrorMessage(err, t('recibosCobro.form.saveError'));
      return null;
    } finally {
      isSubmitting.value = false;
    }
  }

  /** Clears the form for the next line — keeps clienteId untouched. Used only by the multi-line modal. */
  function resetLineaForm(): void {
    monedaPagoCode.value = '';
    for (const key of Object.keys(montosAplicados)) delete montosAplicados[key];
    metodoPagoId.value = null;
    cuentaBancariaId.value = '';
    tasaCambio.value = 1;
    observaciones.value = '';
    errorMessage.value = '';
  }

  return {
    monedaPagoCode,
    monedaPago,
    cuentasFiltradas,
    montoAplicado,
    setMontoAplicado,
    montoTotal,
    metodoPagoId,
    metodosDisponibles,
    selectedMetodo,
    isBankAccountRequired,
    cuentaBancariaId,
    activeCuentas,
    cuentaLabel,
    tasaCambio,
    aplicaIgtf,
    igtfMonto,
    observaciones,
    errorMessage,
    isSubmitting,
    canSubmit,
    submitLinea,
    resetLineaForm,
    loadCuentasPendientes,
  };
}
