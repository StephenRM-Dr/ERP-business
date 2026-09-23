import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Currency, CreateCurrencyPayload } from './interfaces/currency.interface';

// Surfaces the backend's own message (e.g. the 409 on a duplicate codigo_iso)
// when available; falls back to a generic i18n key otherwise.
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
  return 'currencies.saveError';
}

/** Raw shape returned by the NestJS `monedas` endpoints (backend/src/monedas). */
interface MonedaDto {
  id: number;
  codigo_iso: string;
  descripcion: string;
  simbolo: string;
  es_moneda_base: boolean;
  activo: boolean;
}

function toCurrency(dto: MonedaDto): Currency {
  return {
    id: String(dto.id),
    code: dto.codigo_iso,
    name: dto.descripcion,
    symbol: dto.simbolo,
    isBase: dto.es_moneda_base,
    isActive: dto.activo,
  };
}

export const useCurrenciesStore = defineStore('currencies', () => {
  const currencies = ref<Currency[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const deleteError = ref<string | null>(null);

  const activeCurrencies = computed<Currency[]>(() =>
    currencies.value.filter((currency) => currency.isActive),
  );

  const baseCurrency = computed<Currency | undefined>(() =>
    currencies.value.find((currency) => currency.isBase),
  );

  function findByCode(code: Currency['code']): Currency | undefined {
    return currencies.value.find((currency) => currency.code === code);
  }

  function getCurrencyById(id: string | number): Currency | undefined {
    const idStr = String(id);
    return currencies.value.find((currency) => currency.id === idStr);
  }

  async function fetchCurrencies(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<MonedaDto[]>('/monedas');
      currencies.value = data.map(toCurrency);
    } catch {
      error.value = 'currencies.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Enables/disables a currency for new invoices.
   * The base currency can never be disabled.
   */
  async function toggleActive(currencyId: string): Promise<void> {
    const currency = currencies.value.find((item) => item.id === currencyId);
    if (!currency || currency.isBase) {
      return;
    }

    const nextActive = !currency.isActive;
    await apiClient.patch(`/monedas/${currency.code}`, { activo: nextActive });
    currency.isActive = nextActive;
  }

  async function updateCurrency(currencyId: string, name: string, symbol: string): Promise<void> {
    const currency = currencies.value.find((item) => item.id === currencyId);
    if (!currency) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedSymbol = symbol.trim();
    await apiClient.patch(`/monedas/${currency.code}`, {
      descripcion: trimmedName,
      simbolo: trimmedSymbol,
    });
    currency.name = trimmedName;
    currency.symbol = trimmedSymbol;
  }

  async function createCurrency(payload: CreateCurrencyPayload): Promise<Currency> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data } = await apiClient.post<MonedaDto>('/monedas', {
        codigo_iso: payload.code.trim().toUpperCase(),
        descripcion: payload.name.trim(),
        simbolo: payload.symbol.trim(),
      });
      const currency = toCurrency(data);
      currencies.value.push(currency);
      return currency;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  /** The base currency can never be deleted. */
  async function deleteCurrency(currencyId: string): Promise<void> {
    const currency = currencies.value.find((item) => item.id === currencyId);
    if (!currency || currency.isBase) {
      return;
    }

    deleteError.value = null;
    try {
      await apiClient.delete(`/monedas/${currency.code}`);
      currencies.value = currencies.value.filter((item) => item.id !== currencyId);
    } catch (err) {
      deleteError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    currencies,
    isLoading,
    error,
    isSaving,
    saveError,
    deleteError,
    activeCurrencies,
    baseCurrency,
    findByCode,
    getCurrencyById,
    fetchCurrencies,
    toggleActive,
    updateCurrency,
    createCurrency,
    deleteCurrency,
  };
});
