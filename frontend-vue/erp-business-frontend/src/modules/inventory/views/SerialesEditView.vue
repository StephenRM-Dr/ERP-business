<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import SerialForm from '../components/SerialForm.vue';
import type { SerialFormData } from '../interfaces/serial.interface';
import { useSerialStore } from '../interfaces/serial.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const serialStore = useSerialStore();

const serialId = computed<string>(() => String(route.params.id));
const serial = computed(() => serialStore.getSerialById(serialId.value));

onMounted(() => {
  if (serialStore.serialList.length === 0) {
    serialStore.fetchSeriales();
  }
});

async function handleSubmit(data: SerialFormData): Promise<void> {
  try {
    await serialStore.updateSerial(serialId.value, data);
    router.push('/inventory/seriales');
  } catch {
    // serialStore.saveError already holds the message; SerialForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.seriales.editSerial') }}</h1>

    <SerialForm
      v-if="serial"
      :initial-data="serial"
      :submit-label="t('common.save')"
      :is-saving="serialStore.isSaving"
      :error-message="serialStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('inventory.seriales.notFound') }}
    </p>
  </div>
</template>
