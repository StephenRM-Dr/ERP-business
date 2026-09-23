import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Category, CategoryFormData } from './category.interface';
import { toCategoriaDtoInput, toCategory, type CategoriaDto } from './category.mapper';

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
  return 'inventory.categories.form.saveError';
}

export const useCategoryStore = defineStore('category', () => {
  const categoryList = ref<Category[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const deleteError = ref<string | null>(null);

  const sortedCategories = computed<Category[]>(() =>
    [...categoryList.value].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  function getCategoryById(id: string): Category | undefined {
    return categoryList.value.find((category) => category.id === id);
  }

  async function fetchCategories(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<CategoriaDto[]>('/categorias');
      categoryList.value = data.map(toCategory);
    } catch {
      error.value = 'inventory.categories.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addCategory(data: CategoryFormData): Promise<Category> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<CategoriaDto>(
        '/categorias',
        toCategoriaDtoInput(data),
      );
      const category = toCategory(created);
      categoryList.value.push(category);
      return category;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateCategory(id: string, data: CategoryFormData): Promise<void> {
    const existing = getCategoryById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      // Target the pre-edit codigo: the backend keys categorias by codigo, not id.
      const { data: updated } = await apiClient.patch<CategoriaDto>(
        `/categorias/${existing.codigo}`,
        toCategoriaDtoInput(data),
      );
      Object.assign(existing, toCategory(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteCategory(id: string): Promise<void> {
    const existing = getCategoryById(id);
    if (!existing) {
      return;
    }

    deleteError.value = null;
    try {
      await apiClient.delete(`/categorias/${existing.codigo}`);
      categoryList.value = categoryList.value.filter((category) => category.id !== id);
    } catch (err) {
      deleteError.value = resolveSaveErrorMessage(err);
      throw err;
    }
  }

  return {
    categoryList,
    sortedCategories,
    isLoading,
    error,
    isSaving,
    saveError,
    deleteError,
    fetchCategories,
    getCategoryById,
    addCategory,
    updateCategory,
    deleteCategory,
  };
});
