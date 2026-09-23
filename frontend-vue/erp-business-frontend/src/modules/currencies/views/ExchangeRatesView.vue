<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useCurrenciesStore } from '../currencies.store';
import { useExchangeRatesStore } from '../exchange-rates.store';
import type { Currency } from '../interfaces/currency.interface';

const { t } = useI18n();
const currenciesStore = useCurrenciesStore();
const exchangeRatesStore = useExchangeRatesStore();

const selectedCurrencyCode = ref<Currency['code']>('VES');
const newRate = ref<number | null>(null);

onMounted(() => {
  if (currenciesStore.currencies.length === 0) {
    currenciesStore.fetchCurrencies();
  }
  exchangeRatesStore.fetchRates();
});

// USD is the base currency now, so it's never a registrable rate itself.
const foreignCurrencies = computed<Currency[]>(() =>
  currenciesStore.currencies.filter((currency) => !currency.isBase),
);

// USD is the system's base currency, so a rate is always entered as "units
// of currency per 1 USD" (e.g. 742.81 Bs. per USD) — the natural convention
// for VES/COP. The backend stores it inverted, as USD per 1 unit of currency.
const resolvedRate = computed<number | null>(() => {
  if (newRate.value === null || newRate.value <= 0) {
    return null;
  }
  return 1 / newRate.value;
});

const canSubmit = computed<boolean>(() => resolvedRate.value !== null);

/** Display convention: how many units of `code` equal 1 USD. */
function unitsPerUsd(code: Currency['code']): number {
  const rate = exchangeRatesStore.rateFor(code);
  return rate === 0 ? 0 : 1 / rate;
}

async function handleSubmit(): Promise<void> {
  if (resolvedRate.value === null) {
    return;
  }

  try {
    await exchangeRatesStore.registerRate({
      currencyCode: selectedCurrencyCode.value,
      rate: resolvedRate.value,
    });
    newRate.value = null;
  } catch {
    // exchangeRatesStore.saveError already holds the message; shown below the form.
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-800">{{ t('exchangeRates.title') }}</h1>
    <p class="mb-6 text-sm text-gray-500">{{ t('exchangeRates.description') }}</p>

    <!-- Current rates -->
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div
        v-for="currency in foreignCurrencies"
        :key="currency.code"
        class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">
          {{ currency.name }} ({{ currency.code }})
        </p>
        <p class="mt-2 text-2xl font-bold text-gray-900">
          {{ unitsPerUsd(currency.code).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) }}
          <span class="text-sm font-medium text-gray-500">{{ currency.code }} / 1 USD</span>
        </p>
        <p class="mt-1 text-xs text-gray-400">
          {{ t('exchangeRates.effectiveDate') }}:
          {{ exchangeRatesStore.latestRates[currency.code]?.effectiveDate ?? '—' }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Register new rate -->
      <form
        class="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        @submit.prevent="handleSubmit"
      >
        <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          {{ t('exchangeRates.register') }}
        </h2>

        <label for="rate-currency" class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('exchangeRates.currency') }}
        </label>
        <select
          id="rate-currency"
          v-model="selectedCurrencyCode"
          class="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        >
          <option v-for="currency in foreignCurrencies" :key="currency.code" :value="currency.code">
            {{ currency.code }} — {{ currency.name }}
          </option>
        </select>

        <label for="rate-value" class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('exchangeRates.rateValuePerUsd', { code: selectedCurrencyCode }) }}
        </label>
        <input
          id="rate-value"
          v-model.number="newRate"
          type="number"
          step="0.0001"
          min="0"
          placeholder="742.8100"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        />

        <p v-if="resolvedRate !== null" class="mt-1 text-xs text-gray-400">
          {{ t('exchangeRates.resolvedPreview', { rate: resolvedRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 }), code: selectedCurrencyCode }) }}
        </p>

        <p v-if="exchangeRatesStore.saveError" class="mt-4 mb-4 text-xs text-red-600">
          {{ t(exchangeRatesStore.saveError) }}
        </p>

        <button
          type="submit"
          :disabled="!canSubmit || exchangeRatesStore.isSaving"
          class="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {{ exchangeRatesStore.isSaving ? t('exchangeRates.saving') : t('common.save') }}
        </button>
      </form>

      <!-- History -->
      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
        <div class="border-b border-gray-200 px-5 py-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-600">
            {{ t('exchangeRates.history') }}
          </h2>
        </div>
        <p v-if="exchangeRatesStore.isLoading" class="px-5 py-10 text-center text-sm text-gray-400">
          {{ t('exchangeRates.loading') }}
        </p>
        <p v-else-if="exchangeRatesStore.error" class="px-5 py-10 text-center text-sm text-red-500">
          {{ t(exchangeRatesStore.error) }}
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="px-5 py-3.5 font-medium">{{ t('exchangeRates.effectiveDate') }}</th>
                <th class="px-5 py-3.5 font-medium">{{ t('exchangeRates.currency') }}</th>
                <th class="px-5 py-3.5 text-right font-medium">{{ t('exchangeRates.rateValue') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rate in exchangeRatesStore.history"
                :key="rate.id"
                class="border-t border-gray-100 hover:bg-gray-50/60 transition"
              >
                <td class="px-5 py-3.5 text-gray-600">{{ rate.effectiveDate }}</td>
                <td class="px-5 py-3.5 font-mono font-semibold text-gray-800">
                  {{ rate.currencyCode }}
                </td>
                <td class="px-5 py-3.5 text-right font-semibold text-gray-800">
                  {{ rate.rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
