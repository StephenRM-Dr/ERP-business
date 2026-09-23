import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Rol, RolFormData } from './rol.interface';
import { toRol, toRolDtoInput, type RolDto } from './rol.mapper';
import { usePermisoStore } from './permiso.store';

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
  return 'master.roles.form.saveError';
}

export const useRolStore = defineStore('rol', () => {
  const rolList = ref<Rol[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const permisoStore = usePermisoStore();

  // Ids for which modulosPermitidos already reflects GET /roles/:id — the
  // list endpoint (GET /roles) doesn't include permisos, so this is filled
  // in lazily via ensureRolPermisos.
  const loadedPermisosIds = new Set<string>();

  const sortedRoles = computed<Rol[]>(() =>
    [...rolList.value].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  function getRolById(id: string): Rol | undefined {
    return rolList.value.find((rol) => rol.id === id);
  }

  async function fetchRoles(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<RolDto[]>('/roles');
      rolList.value = data.map(toRol);
    } catch {
      error.value = 'master.roles.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  /** Loads the permisos of a single rol (GET /roles/:id) into rolList, once. */
  async function ensureRolPermisos(id: string): Promise<void> {
    if (loadedPermisosIds.has(id)) {
      return;
    }
    const rol = getRolById(id);
    if (!rol) {
      return;
    }
    const { data } = await apiClient.get<RolDto>(`/roles/${id}`);
    rol.modulosPermitidos = (data.permisos ?? []).map((permiso) => permiso.clave_permiso);
    loadedPermisosIds.add(id);
  }

  async function savePermisos(id: string, modulosPermitidos: string[]): Promise<void> {
    await permisoStore.fetchPermisos();
    const permisoIds = permisoStore.permisoIdsFromClaves(modulosPermitidos);
    await apiClient.put(`/roles/${id}/permisos`, { permisoIds });
    loadedPermisosIds.add(id);
  }

  async function addRol(data: RolFormData): Promise<Rol> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: created } = await apiClient.post<RolDto>('/roles', toRolDtoInput(data));
      const rol = toRol(created);
      await savePermisos(rol.id, data.modulosPermitidos);
      rol.modulosPermitidos = data.modulosPermitidos;
      rolList.value.push(rol);
      return rol;
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateRol(id: string, data: RolFormData): Promise<void> {
    const existing = getRolById(id);
    if (!existing) {
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      const { data: updated } = await apiClient.patch<RolDto>(
        `/roles/${existing.id}`,
        toRolDtoInput(data),
      );
      await savePermisos(existing.id, data.modulosPermitidos);
      Object.assign(existing, toRol(updated), { modulosPermitidos: data.modulosPermitidos });
    } catch (err) {
      saveError.value = resolveSaveErrorMessage(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteRol(id: string): Promise<void> {
    const existing = getRolById(id);
    if (!existing) {
      return;
    }

    await apiClient.delete(`/roles/${existing.id}`);
    rolList.value = rolList.value.filter((rol) => rol.id !== id);
    loadedPermisosIds.delete(id);
  }

  return {
    rolList,
    sortedRoles,
    isLoading,
    error,
    isSaving,
    saveError,
    fetchRoles,
    ensureRolPermisos,
    getRolById,
    addRol,
    updateRol,
    deleteRol,
  };
});
