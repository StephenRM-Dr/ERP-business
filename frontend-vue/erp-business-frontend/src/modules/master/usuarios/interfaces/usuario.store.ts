import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Usuario, UsuarioFormData } from './usuario.interface';
import { toUsuario, toUsuarioDtoInput, type UsuarioDto } from './usuario.mapper';

function resolveSaveErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string | string[] } | undefined)?.message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }
  }
  return 'master.usuarios.form.saveError';
}

export const useUsuarioStore = defineStore('usuario', () => {
  const usuarioList = ref<Usuario[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);

  const sortedUsuarios = computed<Usuario[]>(() =>
    [...usuarioList.value].sort((a, b) => a.username.localeCompare(b.username)),
  );

  function getUsuarioById(id: string): Usuario | undefined {
    return usuarioList.value.find((usuario) => usuario.id === id);
  }

  async function fetchUsuarios(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<UsuarioDto[]>('/usuarios');
      usuarioList.value = data.map(toUsuario);
    } catch {
      error.value = 'master.usuarios.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addUsuario(data: UsuarioFormData): Promise<Usuario> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<UsuarioDto>(
        '/usuarios',
        toUsuarioDtoInput(data),
      );
      const usuario = toUsuario(created);
      usuarioList.value.push(usuario);
      return usuario;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateUsuario(id: string, data: UsuarioFormData): Promise<void> {
    const existing = getUsuarioById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      // Target the pre-edit username: the backend keys usuarios by username, not id.
      const { data: updated } = await apiClient.patch<UsuarioDto>(
        `/usuarios/${existing.username}`,
        toUsuarioDtoInput(data),
      );
      Object.assign(existing, toUsuario(updated));
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteUsuario(id: string): Promise<void> {
    const existing = getUsuarioById(id);
    if (!existing) {
      return;
    }

    await apiClient.delete(`/usuarios/${existing.username}`);
    usuarioList.value = usuarioList.value.filter((usuario) => usuario.id !== id);
  }

  return {
    usuarioList,
    sortedUsuarios,
    isLoading,
    error,
    isSaving,
    saveError,
    fetchUsuarios,
    getUsuarioById,
    addUsuario,
    updateUsuario,
    deleteUsuario,
  };
});
