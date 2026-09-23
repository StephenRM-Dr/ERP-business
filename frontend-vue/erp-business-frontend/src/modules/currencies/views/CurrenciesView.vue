<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { useCurrenciesStore } from '../currencies.store';
import type { CreateCurrencyPayload, Currency } from '../interfaces/currency.interface';

const { t } = useI18n();
const currenciesStore = useCurrenciesStore();

const currencyToDelete = ref<Currency | null>(null);
const isDeleting = ref<boolean>(false);

async function confirmDelete(): Promise<void> {
  if (currencyToDelete.value) {
    isDeleting.value = true;
    try {
      await currenciesStore.deleteCurrency(currencyToDelete.value.id);
      currencyToDelete.value = null;
    } catch {
      // Keep dialog open so the store's error message is visible.
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  currencyToDelete.value = null;
  currenciesStore.deleteError = null;
}

onMounted(() => {
  currenciesStore.fetchCurrencies();
});

function handleNameChange(currencyId: string, symbol: string, event: Event): void {
  const input = event.target as HTMLInputElement;
  currenciesStore.updateCurrency(currencyId, input.value, symbol);
}

function handleSymbolChange(currencyId: string, name: string, event: Event): void {
  const input = event.target as HTMLInputElement;
  currenciesStore.updateCurrency(currencyId, name, input.value);
}

const newCurrency = reactive<CreateCurrencyPayload>({ code: '', name: '', symbol: '' });
const createErrorMessage = ref<string>('');

async function handleCreateCurrency(): Promise<void> {
  createErrorMessage.value = '';
  try {
    await currenciesStore.createCurrency(newCurrency);
    newCurrency.code = '';
    newCurrency.name = '';
    newCurrency.symbol = '';
  } catch {
    createErrorMessage.value = currenciesStore.saveError ?? 'currencies.saveError';
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-800">{{ t('currencies.title') }}</h1>
    <p class="mb-6 text-sm text-gray-500">{{ t('currencies.description') }}</p>

    <form
      class="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      @submit.prevent="handleCreateCurrency"
    >
      <div>
        <label for="new-currency-code" class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('currencies.code') }}
        </label>
        <input
          id="new-currency-code"
          v-model="newCurrency.code"
          type="text"
          maxlength="10"
          required
          class="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        />
      </div>
      <div>
        <label for="new-currency-name" class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('currencies.name') }}
        </label>
        <input
          id="new-currency-name"
          v-model="newCurrency.name"
          type="text"
          maxlength="50"
          required
          class="w-full max-w-xs rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        />
      </div>
      <div>
        <label for="new-currency-symbol" class="mb-1 block text-xs font-medium text-gray-500">
          {{ t('currencies.symbol') }}
        </label>
        <input
          id="new-currency-symbol"
          v-model="newCurrency.symbol"
          type="text"
          maxlength="10"
          required
          class="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        />
      </div>
      <button
        type="submit"
        :disabled="currenciesStore.isSaving"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ currenciesStore.isSaving ? t('common.saving') : t('currencies.addCurrency') }}
      </button>
      <p v-if="createErrorMessage" class="w-full text-sm text-red-600">
        {{ t(createErrorMessage) }}
      </p>
    </form>

    <p v-if="currenciesStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('currencies.loading') }}
    </p>
    <p v-else-if="currenciesStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(currenciesStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('currencies.code') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('currencies.name') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('currencies.symbol') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('currencies.role') }}</th>
              <th class="px-5 py-3.5 text-center font-medium">{{ t('currencies.active') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="currency in currenciesStore.currencies"
              :key="currency.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono font-semibold text-gray-800">
                {{ currency.code }}
              </td>
              <td class="px-5 py-3.5">
                <input
                  :id="`currency-name-${currency.id}`"
                  type="text"
                  :value="currency.name"
                  :aria-label="t('currencies.name')"
                  class="w-full max-w-xs rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                  @change="handleNameChange(currency.id, currency.symbol, $event)"
                />
              </td>
              <td class="px-5 py-3.5">
                <input
                  :id="`currency-symbol-${currency.id}`"
                  type="text"
                  :value="currency.symbol"
                  :aria-label="t('currencies.symbol')"
                  class="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                  @change="handleSymbolChange(currency.id, currency.name, $event)"
                />
              </td>
              <td class="px-5 py-3.5">
                <span
                  v-if="currency.isBase"
                  class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-navy-light"
                >
                  {{ t('currencies.base') }}
                </span>
                <span
                  v-else
                  class="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand"
                >
                  {{ t('currencies.foreign') }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-center">
                <ToggleSwitch
                  :modelValue="currency.isActive"
                  :disabled="currency.isBase"
                  :ariaLabel="`${t('currencies.active')} ${currency.code}`"
                  @update:modelValue="currenciesStore.toggleActive(currency.id)"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <button
                  v-if="!currency.isBase"
                  type="button"
                  class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                  @click="currencyToDelete = currency"
                >
                  {{ t('common.delete') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-700">
      {{ t('currencies.pricingNote') }}
    </p>

    <ConfirmDialog
      :open="currencyToDelete !== null"
      :title="t('currencies.deleteDialog.title')"
      :message="t('currencies.deleteDialog.message', { code: currencyToDelete?.code ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    >
      <p v-if="currenciesStore.deleteError" class="mt-3 text-sm text-red-600">
        {{ currenciesStore.deleteError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
