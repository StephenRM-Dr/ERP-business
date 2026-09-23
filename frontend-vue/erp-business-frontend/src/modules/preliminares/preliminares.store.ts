import { defineStore } from 'pinia';
import { ref } from 'vue';

import apiClient from '@/api/axios-client';
import {
  toPreliminarSummary,
  type PreliminarDto,
  type PreliminarPayload,
  type PreliminarResumenDto,
  type PreliminarSummary,
  type PreliminarType,
} from './interfaces/preliminar.interface';

/**
 * Borradores de factura y de transferencia. El store es genérico a propósito:
 * el backend guarda el payload sin interpretarlo, y cada pantalla sabe cómo
 * armar y cómo reconstruir el suyo.
 */
export const usePreliminaresStore = defineStore('preliminares', () => {
  const list = ref<PreliminarSummary[]>([]);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  async function fetchList(type: PreliminarType): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<PreliminarResumenDto[]>('/preliminares', {
        params: { tipo: type },
      });
      list.value = data.map(toPreliminarSummary);
    } catch {
      error.value = 'preliminares.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchOne<P extends PreliminarPayload>(id: number): Promise<P> {
    const { data } = await apiClient.get<PreliminarDto>(`/preliminares/${id}`);
    return data.payload as P;
  }

  /**
   * Crea o sobreescribe. Devuelve el id, que la pantalla guarda para que el
   * siguiente "Guardar preliminar" actualice este mismo registro en vez de
   * acumular una copia por cada ajuste del pedido.
   */
  async function save(
    type: PreliminarType,
    label: string,
    payload: PreliminarPayload,
    id: number | null,
  ): Promise<number> {
    if (id !== null) {
      await apiClient.patch(`/preliminares/${id}`, { etiqueta: label, payload });
      return id;
    }
    const { data } = await apiClient.post<PreliminarDto>('/preliminares', {
      tipo: type,
      etiqueta: label,
      payload,
    });
    return data.id;
  }

  async function remove(id: number): Promise<void> {
    await apiClient.delete(`/preliminares/${id}`);
    list.value = list.value.filter((item) => item.id !== id);
  }

  return {
    list,
    isLoading,
    error,
    fetchList,
    fetchOne,
    save,
    remove,
  };
});
