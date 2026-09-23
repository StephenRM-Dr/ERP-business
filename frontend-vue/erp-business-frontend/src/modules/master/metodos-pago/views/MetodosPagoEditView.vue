<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import MetodoPagoForm from '../components/MetodoPagoForm.vue';
import type { MetodoPagoFormData } from '../interfaces/metodo-pago.interface';
import { useMetodoPagoStore } from '../interfaces/metodo-pago.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const metodoStore = useMetodoPagoStore();

const metodoId = computed<string>(() => String(route.params.id));
const metodo = computed(() => metodoStore.getMetodoById(metodoId.value));

onMounted(() => {
  if (metodoStore.metodoList.length === 0) {
    metodoStore.fetchMetodos();
  }
});

async function handleSubmit(data: MetodoPagoFormData): Promise<void> {
  try {
    await metodoStore.updateMetodo(metodoId.value, data);
    router.push('/master/metodos-pago');
  } catch {
    // metodoStore.saveError already holds the message; MetodoPagoForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.metodosPago.editMetodo') }}</h1>

    <MetodoPagoForm
      v-if="metodo"
      :initial-data="metodo"
      :submit-label="t('common.save')"
      :is-saving="metodoStore.isSaving"
      :error-message="metodoStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('master.metodosPago.notFound') }}
    </p>
  </div>
</template>
