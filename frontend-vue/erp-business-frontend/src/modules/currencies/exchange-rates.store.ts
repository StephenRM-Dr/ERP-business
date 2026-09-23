import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import { roundCurrency } from '@/utils/money';
import type { CreateExchangeRatePayload, Currency, ExchangeRate } from './interfaces/currency.interface';

/** Raw shape returned by GET /monedas — only used here to resolve moneda_id <-> codigo_iso. */
interface MonedaDto {
  id: number;
  codigo_iso: string;
}

/** Raw shape returned by the NestJS `tasas-cambio` endpoints (backend/src/tasas-cambio). */
interface TasaCambioDto {
  id: number;
  moneda_id: number;
  fecha_tasa: string;
  factor: string;
  usuario_id: number | null;
}

function resolveSaveErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string | string[] } | undefined)?.message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }
  }
  return 'exchangeRates.saveError';
}

export const useExchangeRatesStore = defineStore('exchangeRates', () => {
  const rates = ref<ExchangeRate[]>([]);
  // moneda_id per currency code, resolved from GET /monedas so registerRate can
  // send the FK the backend actually expects.
  const monedaIdByCode = ref<Partial<Record<Currency['code'], number>>>({});
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);

  async function fetchRates(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const [monedasRes, tasasRes] = await Promise.all([
        apiClient.get<MonedaDto[]>('/monedas'),
        apiClient.get<TasaCambioDto[]>('/tasas-cambio'),
      ]);

      const codeById = new Map<number, Currency['code']>(
        monedasRes.data.map((moneda) => [moneda.id, moneda.codigo_iso as Currency['code']]),
      );
      monedaIdByCode.value = Object.fromEntries(
        monedasRes.data.map((moneda) => [moneda.codigo_iso, moneda.id]),
      );

      rates.value = tasasRes.data.flatMap((dto): ExchangeRate[] => {
        const currencyCode = codeById.get(dto.moneda_id);
        if (!currencyCode) {
          return [];
        }
        return [
          {
            id: String(dto.id),
            currencyCode,
            rate: Number(dto.factor),
            effectiveDate: dto.fecha_tasa.slice(0, 10),
            registeredAt: dto.fecha_tasa,
          },
        ];
      });
    } catch {
      error.value = 'exchangeRates.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Latest registered rate per currency (VES per 1 unit).
   */
  const latestRates = computed<Record<string, ExchangeRate>>(() => {
    const byCurrency: Record<string, ExchangeRate> = {};

    for (const rate of rates.value) {
      const current = byCurrency[rate.currencyCode];
      if (!current || rate.registeredAt > current.registeredAt) {
        byCurrency[rate.currencyCode] = rate;
      }
    }

    return byCurrency;
  });

  const history = computed<ExchangeRate[]>(() =>
    [...rates.value].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)),
  );

  /**
   * Rate in USD per 1 unit of the given currency. The base currency (USD) is
   * always 1 — the system prices products in USD, so it's the pivot every
   * other currency's rate is quoted against.
   */
  function rateFor(code: Currency['code']): number {
    if (code === 'USD') {
      return 1;
    }
    return latestRates.value[code]?.rate ?? 0;
  }

  /**
   * Converts an amount between currencies going through USD.
   * Returns 0 when a needed rate is missing so the UI can warn the user.
   */
  function convert(amount: number, from: Currency['code'], to: Currency['code']): number {
    if (from === to) {
      return roundCurrency(amount);
    }

    const fromRate = rateFor(from);
    const toRate = rateFor(to);

    if (fromRate === 0 || toRate === 0) {
      return 0;
    }

    return roundCurrency((amount * fromRate) / toRate);
  }

  async function registerRate(payload: CreateExchangeRatePayload): Promise<void> {
    const monedaId = monedaIdByCode.value[payload.currencyCode];
    if (!monedaId) {
      saveError.value = 'exchangeRates.unknownCurrencyError';
      throw new Error(saveError.value);
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      await apiClient.post('/tasas-cambio', { moneda_id: monedaId, factor: payload.rate });
      await fetchRates();
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  return {
    rates,
    isLoading,
    error,
    isSaving,
    saveError,
    latestRates,
    history,
    fetchRates,
    rateFor,
    convert,
    registerRate,
  };
});
