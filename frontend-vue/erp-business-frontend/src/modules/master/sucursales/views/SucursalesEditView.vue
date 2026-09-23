<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import SucursalForm from '../components/SucursalForm.vue';
import type { SucursalFormData } from '../interfaces/sucursal.interface';
import { useSucursalStore } from '../interfaces/sucursal.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const sucursalStore = useSucursalStore();

const sucursalId = computed<string>(() => String(route.params.id));
const sucursal = computed(() => sucursalStore.getSucursalById(sucursalId.value));

onMounted(() => {
  if (sucursalStore.sucursalList.length === 0) {
    sucursalStore.fetchSucursales();
  }
});

async function handleSubmit(data: SucursalFormData): Promise<void> {
  try {
    await sucursalStore.updateSucursal(sucursalId.value, data);
    router.push('/master/sucursales');
  } catch {
    // sucursalStore.saveError already holds the message; SucursalForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.sucursales.editSucursal') }}</h1>

    <SucursalForm
      v-if="sucursal"
      :initial-data="sucursal"
      :submit-label="t('common.save')"
      :is-saving="sucursalStore.isSaving"
      :error-message="sucursalStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('master.sucursales.notFound') }}
    </p>
  </div>
</template>
