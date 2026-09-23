import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Product, ProductFormData } from './product.interface';
import { toProduct, toProductoDtoInput, type ProductoDto } from './product.mapper';

// Surfaces the backend's own message (e.g. the 409 on a duplicate codigo)
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
  return 'inventory.products.form.saveError';
}

export const useProductStore = defineStore('product', () => {
  const productList = ref<Product[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);

  const sortedProducts = computed<Product[]>(() =>
    [...productList.value].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  const sortedProductsByCode = computed<Product[]>(() =>
    [...productList.value].sort((a, b) =>
      a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }),
    ),
  );

  function getProductById(id: string): Product | undefined {
    return productList.value.find((product) => product.id === id);
  }

  async function fetchProducts(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<ProductoDto[]>('/productos');
      productList.value = data.map(toProduct);
    } catch {
      error.value = 'inventory.products.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addProduct(data: ProductFormData): Promise<Product> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<ProductoDto>(
        '/productos',
        toProductoDtoInput(data),
      );
      const product = toProduct(created);
      productList.value.push(product);
      return product;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateProduct(id: string, data: ProductFormData): Promise<void> {
    const existing = getProductById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      // Target the pre-edit codigo: the backend keys productos by codigo, not id.
      const { data: updated } = await apiClient.patch<ProductoDto>(
        `/productos/${existing.codigo}`,
        toProductoDtoInput(data),
      );
      Object.assign(existing, toProduct(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteProduct(id: string): Promise<void> {
    const existing = getProductById(id);
    if (!existing) {
      return;
    }

    await apiClient.delete(`/productos/${existing.codigo}`);
    productList.value = productList.value.filter((product) => product.id !== id);
  }

  return {
    productList,
    sortedProducts,
    sortedProductsByCode,
    isLoading,
    error,
    isSaving,
    saveError,
    fetchProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
  };
});
