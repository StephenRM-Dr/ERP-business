<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import RolForm from '../components/RolForm.vue';
import type { RolFormData } from '../interfaces/rol.interface';
import { useRolStore } from '../interfaces/rol.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const rolStore = useRolStore();

const rolId = computed<string>(() => String(route.params.id));
const rol = computed(() => rolStore.getRolById(rolId.value));

onMounted(async () => {
  if (rolStore.rolList.length === 0) {
    await rolStore.fetchRoles();
  }
  await rolStore.ensureRolPermisos(rolId.value);
});

async function handleSubmit(data: RolFormData): Promise<void> {
  try {
    await rolStore.updateRol(rolId.value, data);
    router.push('/master/roles');
  } catch {
    // rolStore.saveError already holds the message; RolForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.roles.editRol') }}</h1>

    <RolForm
      v-if="rol"
      :initial-data="rol"
      :submit-label="t('common.save')"
      :is-saving="rolStore.isSaving"
      :error-message="rolStore.saveError"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('master.roles.notFound') }}
    </p>
  </div>
</template>
