<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import VendedorForm from '../components/VendedorForm.vue';
import type { VendedorFormData } from '../interfaces/vendedor.interface';
import { useVendedorStore } from '../interfaces/vendedor.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const vendedorStore = useVendedorStore();

const vendedorId = computed<string>(() => String(route.params.id));
const vendedor = computed(() => vendedorStore.getVendedorById(vendedorId.value));

onMounted(() => {
  if (vendedorStore.vendedorList.length === 0) {
    vendedorStore.fetchVendedores();
  }
});

async function handleSubmit(data: VendedorFormData): Promise<void> {
  try {
    await vendedorStore.updateVendedor(vendedorId.value, data);
    router.push('/master/vendedores');
  } catch {
    // vendedorStore.saveError already holds the message; VendedorForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.vendedores.editVendedor') }}</h1>

    <VendedorForm
      v-if="vendedor"
      :initial-data="vendedor"
      :submit-label="t('common.save')"
      :is-saving="vendedorStore.isSaving"
      :error-message="vendedorStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('master.vendedores.notFound') }}
    </p>
  </div>
</template>
