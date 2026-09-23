<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import BancoForm from '../components/BancoForm.vue';
import type { BancoFormData } from '../interfaces/banco.interface';
import { useBancoStore } from '../interfaces/banco.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const bancoStore = useBancoStore();

const bancoId = computed<string>(() => String(route.params.id));
const banco = computed(() => bancoStore.getBancoById(bancoId.value));

onMounted(() => {
  if (bancoStore.bancoList.length === 0) {
    bancoStore.fetchBancos();
  }
});

async function handleSubmit(data: BancoFormData): Promise<void> {
  try {
    await bancoStore.updateBanco(bancoId.value, data);
    router.push('/master/bancos');
  } catch {
    // bancoStore.saveError already holds the message; BancoForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.bancos.editBanco') }}</h1>

    <BancoForm
      v-if="banco"
      :initial-data="banco"
      :submit-label="t('common.save')"
      :is-saving="bancoStore.isSaving"
      :error-message="bancoStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('master.bancos.notFound') }}
    </p>
  </div>
</template>
