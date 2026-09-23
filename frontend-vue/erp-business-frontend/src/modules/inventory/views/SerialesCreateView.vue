<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import SerialForm from '../components/SerialForm.vue';
import type { SerialFormData } from '../interfaces/serial.interface';
import { useSerialStore } from '../interfaces/serial.store';

const { t } = useI18n();
const router = useRouter();
const serialStore = useSerialStore();

const emptySerial: SerialFormData = {
  productoId: 0,
  numeroSerial: '',
  depositoId: null,
  vendido: false,
};

async function handleSubmit(data: SerialFormData): Promise<void> {
  try {
    await serialStore.addSerial(data);
    router.push('/inventory/seriales');
  } catch {
    // serialStore.saveError already holds the message; SerialForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('inventory.seriales.newSerial') }}</h1>

    <SerialForm
      :initial-data="emptySerial"
      :submit-label="t('common.save')"
      :is-saving="serialStore.isSaving"
      :error-message="serialStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
