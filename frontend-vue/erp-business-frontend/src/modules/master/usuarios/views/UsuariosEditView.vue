<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import UsuarioForm from '../components/UsuarioForm.vue';
import type { Usuario, UsuarioFormData } from '../interfaces/usuario.interface';
import { useUsuarioStore } from '../interfaces/usuario.store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const usuarioStore = useUsuarioStore();

const usuarioId = computed<string>(() => String(route.params.id));
const usuario = computed(() => usuarioStore.getUsuarioById(usuarioId.value));

// The password field always starts blank on edit — leaving it blank keeps
// the existing clave_hash untouched (see usuario.mapper.ts).
const formData = computed<UsuarioFormData | undefined>(() => {
  const found = usuario.value as Usuario | undefined;
  if (!found) {
    return undefined;
  }
  return { ...found, password: '' };
});

onMounted(() => {
  if (usuarioStore.usuarioList.length === 0) {
    usuarioStore.fetchUsuarios();
  }
});

async function handleSubmit(data: UsuarioFormData): Promise<void> {
  try {
    await usuarioStore.updateUsuario(usuarioId.value, data);
    router.push('/master/usuarios');
  } catch {
    // usuarioStore.saveError already holds the message; UsuarioForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.usuarios.editUsuario') }}</h1>

    <UsuarioForm
      v-if="formData"
      :initial-data="formData"
      :submit-label="t('common.save')"
      :is-saving="usuarioStore.isSaving"
      :error-message="usuarioStore.saveError"
      :is-password-required="false"
      @submit="handleSubmit"
    />
    <p v-else class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
      {{ t('master.usuarios.notFound') }}
    </p>
  </div>
</template>
