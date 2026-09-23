<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import RolForm from '../components/RolForm.vue';
import type { RolFormData } from '../interfaces/rol.interface';
import { useRolStore } from '../interfaces/rol.store';

const { t } = useI18n();
const router = useRouter();
const rolStore = useRolStore();

const emptyRol: RolFormData = {
  nombre: '',
  descripcion: '',
  activo: true,
  modulosPermitidos: [],
};

async function handleSubmit(data: RolFormData): Promise<void> {
  try {
    await rolStore.addRol(data);
    router.push('/master/roles');
  } catch {
    // rolStore.saveError already holds the message; RolForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.roles.newRol') }}</h1>

    <RolForm
      :initial-data="emptyRol"
      :submit-label="t('common.save')"
      :is-saving="rolStore.isSaving"
      :error-message="rolStore.saveError"
      @submit="handleSubmit"
    />
  </div>
</template>
