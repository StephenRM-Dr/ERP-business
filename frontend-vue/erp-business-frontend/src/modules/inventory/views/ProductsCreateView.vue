<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import ProductForm from '../components/ProductForm.vue';
import type { ProductFormData } from '../interfaces/product.interface';
import { useProductStore } from '../interfaces/product.store';

const { t } = useI18n();
const router = useRouter();
const productStore = useProductStore();

const emptyProduct: ProductFormData = {
  codigo: '',
  nombre: '',
  descripcionDetallada: '',
  categoriaId: 0,
  monedaBaseId: 0,
  unidadMedida: 'UND',
  pesoKg: 0,
  activo: true,
  referencia: '',
  marca: '',
  modelo: '',
  precioCosto: null,
  precioVenta: null,
  monedaVentaId: null,
  impuestoPorcentaje: null,
  capacidadContenido: null,
  montoComision: null,
  departamentoId: null,
  manejaLotes: false,
  manejaSeriales: false,
  permiteDecimales: false,
  sujetoComisionFija: false,
};

async function handleSubmit(data: ProductFormData): Promise<void> {
  try {
    await productStore.addProduct(data);
    router.push('/inventory/products');
  } catch {
    // productStore.saveError already holds the message; ProductForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.products.newProduct') }}</h1>

    <ProductForm
      :initial-data="emptyProduct"
      :submit-label="t('common.save')"
      :is-saving="productStore.isSaving"
      :error-message="productStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
