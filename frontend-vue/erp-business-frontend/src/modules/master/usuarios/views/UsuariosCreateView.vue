<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import UsuarioForm from '../components/UsuarioForm.vue';
import type { UsuarioFormData } from '../interfaces/usuario.interface';
import { useUsuarioStore } from '../interfaces/usuario.store';

const { t } = useI18n();
const router = useRouter();
const usuarioStore = useUsuarioStore();

const emptyUsuario: UsuarioFormData = {
  username: '',
  nombreCompleto: '',
  password: '',
  email: '',
  rolId: null,
  sucursalId: null,
  activo: true,
};

async function handleSubmit(data: UsuarioFormData): Promise<void> {
  try {
    await usuarioStore.addUsuario(data);
    router.push('/master/usuarios');
  } catch {
    // usuarioStore.saveError already holds the message; UsuarioForm displays it.
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">{{ t('master.usuarios.newUsuario') }}</h1>

    <UsuarioForm
      :initial-data="emptyUsuario"
      :submit-label="t('common.save')"
      :is-saving="usuarioStore.isSaving"
      :error-message="usuarioStore.saveError"
      :is-password-required="true"
      @submit="handleSubmit"
    />
  </div>
</template>
