<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PaginationBar from '@/components/ui/PaginationBar.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { usePagination } from '@/composables/usePagination';
import CustomerImportModal from '../components/CustomerImportModal.vue';
import type { Customer } from '../interfaces/customer.interface';
import { useCustomerStore } from '../interfaces/customer.store';

const { t } = useI18n();
const customerStore = useCustomerStore();

const searchTerm = ref<string>('');
const customerToDelete = ref<Customer | null>(null);
const isDeleting = ref<boolean>(false);
const showImportModal = ref<boolean>(false);

const sortField = ref<'documento' | 'nombre'>('nombre');
const sortOrder = ref<'asc' | 'desc'>('asc');

function toggleSort(field: 'documento' | 'nombre') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
  pagination.resetPage();
}

onMounted(() => {
  customerStore.fetchCustomers();
});

const filteredCustomers = computed<Customer[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();

  const list = customerStore.customerList.filter((customer) => {
    return (
      term === '' ||
      customer.firstName.toLowerCase().includes(term) ||
      customer.lastName.toLowerCase().includes(term) ||
      customer.documentNumber.toLowerCase().includes(term)
    );
  });

  return list.sort((a, b) => {
    let comparison = 0;
    if (sortField.value === 'documento') {
      comparison = a.documentNumber.localeCompare(b.documentNumber, undefined, { numeric: true, sensitivity: 'base' });
    } else {
      comparison = a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' });
    }
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });
});

const pagination = usePagination(filteredCustomers, 10);

watch(searchTerm, () => pagination.resetPage());

async function confirmDelete(): Promise<void> {
  if (customerToDelete.value) {
    isDeleting.value = true;
    try {
      await customerStore.deleteCustomer(customerToDelete.value.id);
      customerToDelete.value = null;
    } finally {
      isDeleting.value = false;
    }
  }
}

function cancelDelete(): void {
  customerToDelete.value = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('customers.title') }}</h1>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 active:scale-95"
          title="Actualizar listado desde la base de datos"
          @click="customerStore.fetchCustomers()"
        >
          <span>🔄 Refrescar</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 active:scale-95"
          @click="showImportModal = true"
        >
          <span>📥 Importar Excel</span>
        </button>
        <RouterLink
          to="/customers/create"
          class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover active:scale-95"
        >
          {{ t('customers.newCustomer') }}
        </RouterLink>
      </div>
    </div>

    <!-- Buscador y controles de ordenamiento -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex-1 min-w-[240px]">
        <SearchInput id="customers-search" v-model="searchTerm" :placeholder="t('customers.searchPlaceholder')" />
      </div>

      <div class="flex items-center gap-2 text-xs">
        <span class="text-gray-500 font-medium">Ordenar por:</span>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition border shadow-xs active:scale-95"
          :class="sortField === 'documento' ? 'bg-brand text-white border-brand' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
          @click="toggleSort('documento')"
        >
          <span>🔢 Documento</span>
          <span v-if="sortField === 'documento'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition border shadow-xs active:scale-95"
          :class="sortField === 'nombre' ? 'bg-brand text-white border-brand' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
          @click="toggleSort('nombre')"
        >
          <span>👤 Nombre</span>
          <span v-if="sortField === 'nombre'">{{ sortOrder === 'asc' ? '▲ (A-Z)' : '▼ (Z-A)' }}</span>
        </button>
      </div>
    </div>

    <p v-if="customerStore.isLoading" class="py-10 text-center text-sm text-gray-400">
      {{ t('customers.loading') }}
    </p>
    <p v-else-if="customerStore.error" class="py-10 text-center text-sm text-red-500">
      {{ t(customerStore.error) }}
    </p>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th
                class="px-5 py-3.5 font-medium cursor-pointer hover:bg-gray-100 transition select-none"
                title="Haga clic para ordenar por Documento"
                @click="toggleSort('documento')"
              >
                <div class="flex items-center gap-1.5">
                  <span>{{ t('customers.form.documentNumber') }}</span>
                  <span v-if="sortField === 'documento'" class="text-xs text-brand font-bold">
                    {{ sortOrder === 'asc' ? '▲' : '▼' }}
                  </span>
                  <span v-else class="text-xs text-gray-400">⇅</span>
                </div>
              </th>
              <th
                class="px-5 py-3.5 font-medium cursor-pointer hover:bg-gray-100 transition select-none"
                title="Haga clic para ordenar por Nombre"
                @click="toggleSort('nombre')"
              >
                <div class="flex items-center gap-1.5">
                  <span>{{ t('customers.list.name') }}</span>
                  <span v-if="sortField === 'nombre'" class="text-xs text-brand font-bold">
                    {{ sortOrder === 'asc' ? '▲' : '▼' }}
                  </span>
                  <span v-else class="text-xs text-gray-400">⇅</span>
                </div>
              </th>
              <th class="px-5 py-3.5 font-medium">{{ t('customers.form.phone') }}</th>
              <th class="px-5 py-3.5 text-right font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="customer in pagination.pageItems.value"
              :key="customer.id"
              class="border-t border-gray-100 hover:bg-gray-50/60 transition"
            >
              <td class="px-5 py-3.5 font-mono text-gray-600">
                {{ customer.documentType }}-{{ customer.documentNumber }}
              </td>
              <td class="px-5 py-3.5 font-semibold text-gray-800">
                {{ customer.firstName }} {{ customer.lastName }}
                <span
                  v-if="customer.isSpecialTaxpayer"
                  class="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
                >
                  {{ t('customers.list.specialTaxpayer') }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-gray-600">{{ customer.phone || '—' }}</td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="`/customers/${customer.id}/edit`"
                    class="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                  >
                    {{ t('common.edit') }}
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    @click="customerToDelete = customer"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="pagination.totalItems.value === 0">
              <td colspan="4" class="px-5 py-10 text-center text-sm text-gray-400">
                {{ t('customers.empty') }}
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
      :open="customerToDelete !== null"
      :title="t('customers.deleteDialog.title')"
      :message="
        t('customers.deleteDialog.message', {
          name: `${customerToDelete?.firstName ?? ''} ${customerToDelete?.lastName ?? ''}`,
        })
      "
      :confirm-label="t('common.delete')"
      :confirm-disabled="isDeleting"
      destructive
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <!-- Modal de Importación Masiva desde Excel -->
    <CustomerImportModal
      v-if="showImportModal"
      @close="showImportModal = false"
      @imported="customerStore.fetchCustomers()"
    />
  </div>
</template>
