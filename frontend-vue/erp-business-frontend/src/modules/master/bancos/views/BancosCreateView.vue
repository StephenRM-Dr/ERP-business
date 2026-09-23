<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import BancoForm from '../components/BancoForm.vue';
import type { BancoFormData } from '../interfaces/banco.interface';
import { useBancoStore } from '../interfaces/banco.store';

const { t } = useI18n();
const router = useRouter();
const bancoStore = useBancoStore();

const emptyBanco: BancoFormData = {
  codigo: '',
  nombre: '',
  activo: true,
};

async function handleSubmit(data: BancoFormData): Promise<void> {
  try {
    await bancoStore.addBanco(data);
    router.push('/master/bancos');
  } catch {
    // bancoStore.saveError already holds the message; BancoForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.bancos.newBanco') }}</h1>

    <BancoForm
      :initial-data="emptyBanco"
      :submit-label="t('common.save')"
      :is-saving="bancoStore.isSaving"
      :error-message="bancoStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
