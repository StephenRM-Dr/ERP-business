<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import CustomerForm from '../components/CustomerForm.vue';
import type { CustomerFormData } from '../interfaces/customer.interface';
import { useCustomerStore } from '../interfaces/customer.store';

const { t } = useI18n();
const router = useRouter();
const customerStore = useCustomerStore();

const emptyCustomer: CustomerFormData = {
  documentType: 'V',
  documentNumber: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  creditLimit: 0,
  paymentTermsDays: 0,
  notes: '',
  isSpecialTaxpayer: false,
};

async function handleSubmit(data: CustomerFormData): Promise<void> {
  try {
    await customerStore.addCustomer(data);
    router.push('/customers');
  } catch {
    // customerStore.saveError already holds the message; CustomerForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('customers.newCustomer') }}</h1>

    <CustomerForm
      :initial-data="emptyCustomer"
      :submit-label="t('common.save')"
      :is-saving="customerStore.isSaving"
      :error-message="customerStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
