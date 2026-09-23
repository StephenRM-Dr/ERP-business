<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import CustomerForm from '../components/CustomerForm.vue';
import type { CustomerFormData } from '../interfaces/customer.interface';
import { useCustomerStore } from '../interfaces/customer.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const customerStore = useCustomerStore();

const customerId = computed<string>(() => String(route.params.id));
const customer = computed(() => customerStore.getCustomerById(customerId.value));

onMounted(() => {
  // Covers direct navigation to this route, where the list may not be loaded yet.
  if (customerStore.customerList.length === 0) {
    customerStore.fetchCustomers();
  }
});

async function handleSubmit(data: CustomerFormData): Promise<void> {
  try {
    await customerStore.updateCustomer(customerId.value, data);
    router.push('/customers');
  } catch {
    // customerStore.saveError already holds the message; CustomerForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('customers.editCustomer') }}</h1>

    <CustomerForm
      v-if="customer"
      :initial-data="customer"
      :submit-label="t('common.save')"
      :is-saving="customerStore.isSaving"
      :error-message="customerStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('customers.notFound') }}
    </p>
  </div>
</template>
