import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { useReciboLinea } from '../useReciboLinea';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import { useRecibosCobroStore } from '@/modules/recibos-cobro/recibos-cobro.store';
import { useIgtfStore } from '@/modules/invoices/igtf.store';

vi.mock('@/api/axios-client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
// useReciboLinea() calls useI18n() at the top of the function. vue-i18n's
// Composition API mode requires an active component instance (or a global
// scope injected by the i18n plugin) to resolve it — neither exists when a
// composable is invoked directly in a unit test, so it throws unless stubbed.
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

describe('useReciboLinea', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('cuentasFiltradas: only includes pending accounts matching the selected payment currency', () => {
    const currenciesStore = useCurrenciesStore();
    currenciesStore.currencies = [
      { id: '1', code: 'VES', name: 'Bolívar', symbol: 'Bs', isBase: true, isActive: true },
      { id: '2', code: 'USD', name: 'Dólar', symbol: '$', isBase: false, isActive: true },
    ];
    const recibosStore = useRecibosCobroStore();
    recibosStore.cuentasPendientes = [
      { id: 'a', clienteId: 5, numeroDocumento: 'FAC-1', fechaVencimiento: '2026-09-01', montoOriginal: 100, saldoPendiente: 100, monedaId: 1 },
      { id: 'b', clienteId: 5, numeroDocumento: 'FAC-2', fechaVencimiento: '2026-09-02', montoOriginal: 200, saldoPendiente: 200, monedaId: 2 },
    ];

    const { monedaPagoCode, cuentasFiltradas } = useReciboLinea(ref('5'));
    monedaPagoCode.value = 'VES';

    expect(cuentasFiltradas.value.map((c) => c.id)).toEqual(['a']);
  });

  it('igtfMonto: 0 when the payment currency is the base currency, even if IGTF is enabled', () => {
    const currenciesStore = useCurrenciesStore();
    currenciesStore.currencies = [
      { id: '1', code: 'VES', name: 'Bolívar', symbol: 'Bs', isBase: true, isActive: true },
    ];
    const igtfStore = useIgtfStore();
    igtfStore.isLoaded = true;
    igtfStore.isEnabled = true;
    igtfStore.ratePercent = 3;

    const { monedaPagoCode, igtfMonto } = useReciboLinea(ref('5'));
    monedaPagoCode.value = 'VES';

    expect(igtfMonto.value).toBe(0);
  });
});
