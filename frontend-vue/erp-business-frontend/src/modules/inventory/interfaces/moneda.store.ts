import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Moneda } from './moneda.interface';
import { toMoneda, type MonedaDto } from './moneda.mapper';

export const useMonedaStore = defineStore('moneda', () => {
  const monedaList = ref<Moneda[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const activeMonedas = computed<Moneda[]>(() => monedaList.value.filter((moneda) => moneda.activo));

  async function fetchMonedas(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<MonedaDto[]>('/monedas');
      monedaList.value = data.map(toMoneda);
    } catch {
      error.value = 'inventory.products.form.monedaFetchError';
    } finally {
      isLoading.value = false;
    }
  }

  return {
    monedaList,
    activeMonedas,
    isLoading,
    error,
    fetchMonedas,
  };
});
