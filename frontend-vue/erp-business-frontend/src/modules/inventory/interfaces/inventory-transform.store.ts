import { defineStore } from 'pinia';
import { ref } from 'vue';

import apiClient from '@/api/axios-client';
import { resolveApiErrorMessage } from '@/utils/api-error';
import type {
  CreateReglaTransformacionData,
  EjecutarTransformacionData,
  EjecutarTransformacionDobleData,
  InvReglaTransformacion,
  InvReglaTransformacionDto,
  InvTransformacion,
  InvTransformacionDto,
  PreviewTransformacion,
  PreviewTransformacionDto,
} from './transformacion.interface';
import {
  toCreateReglaTransformacionDtoInput,
  toCreateTransformacionDobleDtoInput,
  toEjecutarTransformacionDtoInput,
  toInvReglaTransformacion,
  toInvTransformacion,
  toPreviewTransformacion,
} from './transformacion.interface';
import type {
  DocumentoPreliminarInventarioDto,
  InventarioPreliminarPayload,
  InventarioPreliminarSummary,
  TipoPreliminarInventario,
} from './inventario-preliminar.interface';
import {
  toCreatePreliminarInventarioDtoInput,
  toInventarioPreliminarSummary,
} from './inventario-preliminar.interface';

export const useInventoryTransformStore = defineStore('inventoryTransform', () => {
  const reglas = ref<InvReglaTransformacion[]>([]);
  const transformaciones = ref<InvTransformacion[]>([]);
  const preliminares = ref<InventarioPreliminarSummary[]>([]);

  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);

  async function fetchReglas(productoId?: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<InvReglaTransformacionDto[]>('/inventario/reglas', {
        params: productoId ? { producto_id: productoId } : undefined,
      });
      reglas.value = data.map(toInvReglaTransformacion);
    } catch {
      error.value = 'inventory.transformations.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function addRegla(data: CreateReglaTransformacionData): Promise<InvReglaTransformacion> {
    actionError.value = null;
    try {
      const { data: dto } = await apiClient.post<InvReglaTransformacionDto>(
        '/inventario/reglas',
        toCreateReglaTransformacionDtoInput(data),
      );
      const regla = toInvReglaTransformacion(dto);
      reglas.value.push(regla);
      reglas.value.sort((a, b) => a.id - b.id);
      return regla;
    } catch (err) {
      actionError.value = resolveApiErrorMessage(err, 'inventory.transformationRules.form.saveError');
      throw err;
    }
  }

  async function calcularPreview(data: EjecutarTransformacionData): Promise<PreviewTransformacion> {
    actionError.value = null;
    try {
      const { data: dto } = await apiClient.post<PreviewTransformacionDto>(
        '/inventario/transformaciones/calcular',
        toEjecutarTransformacionDtoInput(data),
      );
      return toPreviewTransformacion(dto);
    } catch (err) {
      actionError.value = resolveApiErrorMessage(err, 'inventory.transformations.previewError');
      throw err;
    }
  }

  async function ejecutarTransformacion(data: EjecutarTransformacionData): Promise<InvTransformacion> {
    actionError.value = null;
    try {
      const { data: dto } = await apiClient.post<InvTransformacionDto>(
        '/inventario/transformaciones',
        toEjecutarTransformacionDtoInput(data),
      );
      const transformacion = toInvTransformacion(dto);
      transformaciones.value.unshift(transformacion);
      return transformacion;
    } catch (err) {
      actionError.value = resolveApiErrorMessage(err, 'inventory.transformations.executeError');
      throw err;
    }
  }

  async function ejecutarTransformacionDoble(
    data: EjecutarTransformacionDobleData,
  ): Promise<InvTransformacion> {
    actionError.value = null;
    try {
      const { data: dto } = await apiClient.post<InvTransformacionDto>(
        '/inventario/transformaciones/doble',
        toCreateTransformacionDobleDtoInput(data),
      );
      const transformacion = toInvTransformacion(dto);
      transformaciones.value.unshift(transformacion);
      return transformacion;
    } catch (err) {
      actionError.value = resolveApiErrorMessage(err, 'inventory.transformations.executeError');
      throw err;
    }
  }

  async function fetchTransformacionDetalle(id: number): Promise<InvTransformacion> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<InvTransformacionDto>(`/inventario/transformaciones/${id}`);
      return toInvTransformacion(data);
    } catch (err) {
      error.value = resolveApiErrorMessage(err, 'inventory.transformations.fetchError');
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchTransformaciones(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<InvTransformacionDto[]>('/inventario/transformaciones');
      transformaciones.value = data.map(toInvTransformacion);
    } catch {
      error.value = 'inventory.transformations.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchPreliminares(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<DocumentoPreliminarInventarioDto[]>('/inventario/preliminares');
      preliminares.value = data.map(toInventarioPreliminarSummary);
    } catch {
      error.value = 'inventory.inventoryPreliminares.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function guardarPreliminar(
    tipo: TipoPreliminarInventario,
    etiqueta: string,
    payload: InventarioPreliminarPayload,
  ): Promise<InventarioPreliminarSummary> {
    actionError.value = null;
    try {
      const { data } = await apiClient.post<DocumentoPreliminarInventarioDto>(
        '/inventario/preliminares',
        toCreatePreliminarInventarioDtoInput(tipo, etiqueta, payload),
      );
      const summary = toInventarioPreliminarSummary(data);
      preliminares.value.unshift(summary);
      return summary;
    } catch (err) {
      actionError.value = resolveApiErrorMessage(err, 'inventory.inventoryPreliminares.saveError');
      throw err;
    }
  }

  async function fetchPreliminarDetalle(id: number): Promise<DocumentoPreliminarInventarioDto> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<DocumentoPreliminarInventarioDto>('/inventario/preliminares/' + id);
      return data;
    } catch (err) {
      error.value = resolveApiErrorMessage(err, 'inventory.inventoryPreliminares.fetchError');
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function eliminarPreliminar(id: number): Promise<void> {
    actionError.value = null;
    try {
      await apiClient.delete('/inventario/preliminares/' + id);
      preliminares.value = preliminares.value.filter((item) => item.id !== id);
    } catch (err) {
      actionError.value = resolveApiErrorMessage(err, 'inventory.inventoryPreliminares.deleteError');
      throw err;
    }
  }

  async function aplicarPreliminar(id: number): Promise<void> {
    actionError.value = null;
    try {
      await apiClient.post('/inventario/preliminares/' + id + '/aplicar');
      preliminares.value = preliminares.value.filter((item) => item.id !== id);
    } catch (err) {
      actionError.value = resolveApiErrorMessage(err, 'inventory.inventoryPreliminares.applyError');
      throw err;
    }
  }

  return {
    reglas,
    transformaciones,
    preliminares,
    isLoading,
    error,
    actionError,
    fetchReglas,
    addRegla,
    calcularPreview,
    ejecutarTransformacion,
    ejecutarTransformacionDoble,
    fetchTransformaciones,
    fetchTransformacionDetalle,
    fetchPreliminares,
    fetchPreliminarDetalle,
    guardarPreliminar,
    eliminarPreliminar,
    aplicarPreliminar,
  };
});
