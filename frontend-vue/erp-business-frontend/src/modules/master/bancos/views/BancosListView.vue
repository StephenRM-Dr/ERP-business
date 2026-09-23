<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusChip from '@/components/ui/StatusChip.vue';
import { usePagination } from '@/composables/usePagination';
import { useCuentaBancariaStore } from '@/modules/master/cuentas-bancarias/interfaces/cuenta-bancaria.store';
import { useCurrenciesStore } from '@/modules/currencies/currencies.store';
import type { Banco } from '../interfaces/banco.interface';
import { useBancoStore } from '../interfaces/banco.store';

const { t } = useI18n();
const bancoStore = useBancoStore();
const cuentaStore = useCuentaBancariaStore();
const currenciesStore = useCurrenciesStore();

const searchTerm = ref<string>('');
const bancoToDelete = ref<Banco | null>(null);
const isDeleting = ref<boolean>(false);

onMounted(() => {
  bancoStore.fetchBancos();
  if (cuentaStore.cuentaList.length === 0) {
    cuentaStore.fetchCuentas();
  }
  if (currenciesStore.currencies.length === 0) {
    currenciesStore.fetchCurrencies();
  }
});

function getCuentasForBanco(bancoId: string | number) {
  return cuentaStore.cuentaList.filter((c) => String(c.bancoId) === String(bancoId));
}

const filteredBancos = computed<Banco[]>(() =>
  bancoStore.sortedBancos.filter((banco) => {
    const term = searchTerm.value.trim().toLowerCase();
    if (term === '') return true;
    const cuentas = getCuentasForBanco(banco.id);
    const matchesCuenta = cuentas.some((c) => c.numeroCuenta.toLowerCase().includes(term));
    return (
      banco.nombre.toLowerCase().includes(term) ||
      banco.codigo.toLowerCase().includes(term) ||
      matchesCuenta
    );
  }),
);

const pagination = usePagination(filteredBancos, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (bancoToDelete.value) {
    isDeleting.value = true;
    try {
      await bancoStore.deleteBanco(bancoToDelete.value.id);
      bancoToDelete.value = null;
    } catch {
      // Keep the dialog open so the error message from the store is visible.
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  bancoToDelete.value = null;
  bancoStore.deleteError = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('master.bancos.title') }}</h1>
      <RouterLink
        to="/master/bancos/create"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        {{ t('master.bancos.newBanco') }}
      </RouterLink>
    </div>

    <div class="mb-4">
      <SearchInput id="bancos-search" v-model="searchTerm" />
    </div>

    <p v-if="bancoStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('master.bancos.loading') }}
    </p>
    <p v-else-if="bancoStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(bancoStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3.5 font-medium">{{ t('master.bancos.form.codigo') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.bancos.form.nombre') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('master.cuentasBancarias.title') }}</th>
              <th class="px-5 py-3.5 font-medium">{{ t('common.status') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="banco in pagination.pageItems.value"
              :key="banco.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">{{ banco.codigo }}</td>
              <td class="px-5 py-3.5 font-semibold text-gray-800">{{ banco.nombre }}</td>
              <td class="px-5 py-3.5">
                <div v-if="getCuentasForBanco(banco.id).length > 0" class="flex flex-wrap gap-1.5">
                  <RouterLink
                    v-for="cuenta in getCuentasForBanco(banco.id)"
                    :key="cuenta.id"
                    :to="`/master/cuentas-bancarias/${cuenta.id}/edit`"
                    class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-mono text-gray-700 hover:border-brand hover:bg-brand/5 hover:text-brand transition"
                    :title="cuenta.descripcion ? `${cuenta.descripcion} — Clic para editar` : 'Clic para editar'"
                  >
                    <span>{{ cuenta.numeroCuenta }}</span>
                    <span class="rounded bg-blue-100 px-1 py-0.2 text-[10px] font-bold text-blue-700">
                      {{ currenciesStore.getCurrencyById(cuenta.monedaId)?.code ?? '—' }}
                    </span>
                  </RouterLink>
                </div>
                <span v-else class="text-xs text-gray-400 italic">
                  {{ t('master.cuentasBancarias.empty') }}
                </span>
              </td>
              <td class="px-5 py-3.5">
                <StatusChip
                  :label="banco.activo ? t('common.active') : t('common.inactive')"
                  :tone="banco.activo ? 'success' : 'neutral'"
                />
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/master/bancos/${banco.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="bancoToDelete = banco"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="5" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('master.bancos.empty') }}
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
      :open="bancoToDelete !== null"
      :title="t('master.bancos.deleteDialog.title')"
      :message="t('master.bancos.deleteDialog.message', { name: bancoToDelete?.nombre ?? '' })"
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    >
      <p v-if="bancoStore.deleteError" class="mt-3 text-sm text-red-600">
        {{ bancoStore.deleteError }}
      </p>
    </ConfirmDialog>
  </div>
</template>
