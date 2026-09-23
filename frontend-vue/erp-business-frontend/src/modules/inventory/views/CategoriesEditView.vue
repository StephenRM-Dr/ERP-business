<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import CategoryForm from '../components/CategoryForm.vue';
import type { CategoryFormData } from '../interfaces/category.interface';
import { useCategoryStore } from '../interfaces/category.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const categoryStore = useCategoryStore();

const categoryId = computed<string>(() => String(route.params.id));
const category = computed(() => categoryStore.getCategoryById(categoryId.value));

onMounted(() => {
  // Covers direct navigation to this route, where the list may not be loaded yet.
  if (categoryStore.categoryList.length === 0) {
    categoryStore.fetchCategories();
  }
});

async function handleSubmit(data: CategoryFormData): Promise<void> {
  try {
    await categoryStore.updateCategory(categoryId.value, data);
    router.push('/inventory/categories');
  } catch {
    // categoryStore.saveError already holds the message; CategoryForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.categories.editCategory') }}</h1>

    <CategoryForm
      v-if="category"
      :initial-data="category"
      :submit-label="t('common.save')"
      :is-saving="categoryStore.isSaving"
      :error-message="categoryStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('inventory.categories.notFound') }}
    </p>
  </div>
</template>
