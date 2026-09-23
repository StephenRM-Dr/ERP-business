<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import { useBancoStore } from '@/modules/master/bancos/interfaces/banco.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import type { CuentaBancaria } from '../interfaces/cuenta-bancaria.interface';
import { useCuentaBancariaStore } from '../interfaces/cuenta-bancaria.store';

const { t } = useI18n();
const cuentaStore = useCuentaBancariaStore();
const bancoStore = useBancoStore();
const currenciesStore = useCurrenciesStore();

const searchTerm = ref<string>('');
const cuentaToDelete = ref<CuentaBancaria | null>(null);
const isDeleting = ref<boolean>(false);

onMounted(() => {
  cuentaStore.fetchCuentas();
  if (bancoStore.bancoList.length === 0) {
    bancoStore.fetchBancos();
  }
  if (currenciesStore.currencies.length === 0) {
    currenciesStore.fetchCurrencies();
  }
});

function bancoName(cuenta: CuentaBancaria): string {
  return bancoStore.getBancoById(String(cuenta.bancoId))?.nombre ?? '—';
}

function monedaCode(cuenta: CuentaBancaria): string {
  return currenciesStore.getCurrencyById(cuenta.monedaId)?.code ?? '—';
}

const filteredCuentas = computed<CuentaBancaria[]>(() =>
  cuentaStore.sortedCuentas.filter((cuenta) => {
    const term = searchTerm.value.trim().toLowerCase();
    if (term === '') return true;
    return (
      cuenta.numeroCuenta.toLowerCase().includes(term) ||
      bancoName(cuenta).toLowerCase().includes(term) ||
      monedaCode(cuenta).toLowerCase().includes(term)
    );
  }),
);

const pagination = usePagination(filteredCuentas, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (cuentaToDelete.value) {
    isDeleting.value = true;
    try {
      await cuentaStore.deleteCuenta(cuentaToDelete.value.id);
      cuentaToDelete.value = null;
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  cuentaToDelete.value = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('master.cuentasBancarias.title') }}</h1>
      <RouterLink
        to="/master/cuentas-bancarias/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('master.cuentasBancarias.newCuenta') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="cuentas-search" v-model="searchTerm" />
    </div>

    <p v-if="cuentaStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('master.cuentasBancarias.loading') }}
    </p>
    <p v-else-if="cuentaStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(cuentaStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('master.cuentasBancarias.form.numeroCuenta') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.cuentasBancarias.form.bancoId') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.cuentasBancarias.form.monedaId') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.cuentasBancarias.form.tipoCuenta') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('master.cuentasBancarias.form.saldoConciliado') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cuenta in pagination.pageItems.value"
              :key="cuenta.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ cuenta.numeroCuenta }}</td>
              <td class="px-5 py-3.5 text-gray-600">{{ bancoName(cuenta) }}</td>
              <td class="px-5 py-3.5">
                <span class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {{ monedaCode(cuenta) }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-gray-600">{{ cuenta.tipoCuenta || '—' }}</td>
              <td class="px-5 py-3.5 text-right text-gray-600">{{ cuenta.saldoConciliado.toFixed(2) }}</td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="cuenta.activo ? t('common.active') : t('common.inactive')"
                  :tone="cuenta.activo ? 'success' : 'neutral'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/master/cuentas-bancarias/${cuenta.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="cuentaToDelete = cuenta"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="7" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('master.cuentasBancarias.empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        :page="pagination.page.value"
        :total-pages="pagination.totalPages.value"
        :total-items="pagination.totalItems.value"
        :range-start="pagination.rangeStart.value"
        :range-end="pagination.rangeEnd.value"
        :page-size="pagination.pageSize.value"
        @update:page="pagination.page.value = $event"
        @update:pageSize="pagination.pageSize.value = $event"
      />
    </div>

    <ConfirmDialog
      :open="cuentaToDelete !== null"
      :title="t('master.cuentasBancarias.deleteDialog.title')"
      :message="t('master.cuentasBancarias.deleteDialog.message', { name: cuentaToDelete?.numeroCuenta ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
