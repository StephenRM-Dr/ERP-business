import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Customer, CustomerFormData } from './customer.interface';
import { toClienteDtoInput, toCustomer, type ClienteDto } from './customer.mapper';

// Surfaces the backend's own message (e.g. the 409 on a duplicate numero_documento)
// when available; falls back to a generic i18n key otherwise, same convention as `error` below.
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
  return 'customers.form.saveError';
}

export const useCustomerStore = defineStore('customer', () => {
  const customerList = ref<Customer[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);

  const sortedCustomers = computed<Customer[]>(() =>
    [...customerList.value].sort((a, b) => a.firstName.localeCompare(b.firstName)),
  );

  function getCustomerById(id: string): Customer | undefined {
    return customerList.value.find((customer) => customer.id === id);
  }

  async function fetchCustomers(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<ClienteDto[]>('/clientes');
      customerList.value = data.map(toCustomer);
    } catch {
      error.value = 'customers.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addCustomer(data: CustomerFormData): Promise<Customer> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<ClienteDto>('/clientes', toClienteDtoInput(data));
      const customer = toCustomer(created);
      customerList.value.push(customer);
      return customer;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateCustomer(id: string, data: CustomerFormData): Promise<void> {
    const existing = getCustomerById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      // Target the pre-edit document number: the backend keys clientes by numero_documento, not id.
      const { data: updated } = await apiClient.patch<ClienteDto>(
        `/clientes/${existing.documentNumber}`,
        toClienteDtoInput(data),
      );
      Object.assign(existing, toCustomer(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteCustomer(id: string): Promise<void> {
    const existing = getCustomerById(id);
    if (!existing) {
      return;
    }

    await apiClient.delete(`/clientes/${existing.documentNumber}`);
    customerList.value = customerList.value.filter((customer) => customer.id !== id);
  }

  async function importCustomers(clientes: ImportCustomerItem[]): Promise<ImportCustomerResult> {
    const { data } = await apiClient.post<ImportCustomerResult>('/clientes/importar', { clientes });
    await fetchCustomers();
    return data;
  }

  return {
    customerList,
    sortedCustomers,
    isLoading,
    error,
    isSaving,
    saveError,
    fetchCustomers,
    getCustomerById,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    importCustomers,
  };
});

export interface ImportCustomerItem {
  nombre: string;
  apellido?: string;
  tipo_documento?: string;
  numero_documento: string;
  email?: string;
  telefono?: string;
  limite_credito?: number;
  dias_credito?: number;
  notas?: string;
  contribuyente_especial?: boolean;
}

export interface ImportCustomerResult {
  total: number;
  creados: number;
  actualizados: number;
  errores: Array<{ documento: string; motivo: string }>;
}
