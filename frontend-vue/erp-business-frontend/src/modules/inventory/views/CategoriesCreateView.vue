<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import CategoryForm from '../components/CategoryForm.vue';
import type { CategoryFormData } from '../interfaces/category.interface';
import { useCategoryStore } from '../interfaces/category.store';

const { t } = useI18n();
const router = useRouter();
const categoryStore = useCategoryStore();

const emptyCategory: CategoryFormData = {
  codigo: '',
  nombre: '',
  descripcion: '',
  activo: true,
};

async function handleSubmit(data: CategoryFormData): Promise<void> {
  try {
    await categoryStore.addCategory(data);
    router.push('/inventory/categories');
  } catch {
    // categoryStore.saveError already holds the message; CategoryForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.categories.newCategory') }}</h1>

    <CategoryForm
      :initial-data="emptyCategory"
      :submit-label="t('common.save')"
      :is-saving="categoryStore.isSaving"
      :error-message="categoryStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
