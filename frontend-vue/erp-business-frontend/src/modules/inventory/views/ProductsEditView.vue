<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import ProductForm from '../components/ProductForm.vue';
import type { ProductFormData } from '../interfaces/product.interface';
import { useProductStore } from '../interfaces/product.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const productStore = useProductStore();

const productId = computed<string>(() => String(route.params.id));
const product = computed(() => productStore.getProductById(productId.value));

onMounted(() => {
  // Covers direct navigation to this route, where the list may not be loaded yet.
  if (productStore.productList.length === 0) {
    productStore.fetchProducts();
  }
});

async function handleSubmit(data: ProductFormData): Promise<void> {
  try {
    await productStore.updateProduct(productId.value, data);
    router.push('/inventory/products');
  } catch {
    // productStore.saveError already holds the message; ProductForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.products.editProduct') }}</h1>

    <ProductForm
      v-if="product"
      :initial-data="product"
      :submit-label="t('common.save')"
      :is-saving="productStore.isSaving"
      :error-message="productStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('inventory.products.notFound') }}
    </p>
  </div>
</template>
