import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import type { Permiso } from './permiso.interface';
import { toPermiso, type PermisoDto } from './permiso.mapper';

export const usePermisoStore = defineStore('permiso', () => {
  const permisoList = ref<Permiso[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const idByClave = computed<Record<string, number>>(() =>
    Object.fromEntries(permisoList.value.map((permiso) => [permiso.clavePermiso, permiso.id])),
  );

  async function fetchPermisos(): Promise<void> {
    if (permisoList.value.length > 0) {
      return;
    }
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<PermisoDto[]>('/permisos');
      permisoList.value = data.map(toPermiso);
    } catch {
      error.value = 'master.roles.permisos.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  /** Maps claves (e.g. from RolForm's checkboxes) to permiso ids, dropping any without a match. */
  function permisoIdsFromClaves(claves: string[]): number[] {
    return claves
      .map((clave) => idByClave.value[clave])
      .filter((id): id is number => id !== undefined);
  }

  return {
    permisoList,
    isLoading,
    error,
    idByClave,
    fetchPermisos,
    permisoIdsFromClaves,
  };
});
