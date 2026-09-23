import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '@/api/axios-client';
import { resolveApiErrorMessage } from '@/utils/api-error';
import type {
  DocumentoResumenItem,
  QueryDocumentosFilter,
  AnularLotePayload,
  TipoDocumentoAnulable,
} from './interfaces/anulacion.interface';

export const useAnulacionesStore = defineStore('anulaciones', () => {
  const documentos = ref<DocumentoResumenItem[]>([]);
  const isLoading = ref(false);
  const isAnulando = ref(false);
  const error = ref<string | null>(null);

  async function fetchDocumentos(filter: QueryDocumentosFilter): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const params: Record<string, any> = {
        tipo_documento: filter.tipo_documento,
      };
      if (filter.sucursal_id) params.sucursal_id = filter.sucursal_id;
      if (filter.fecha_desde) params.fecha_desde = filter.fecha_desde;
      if (filter.fecha_hasta) params.fecha_hasta = filter.fecha_hasta;
      if (filter.search) params.search = filter.search;
      if (filter.solo_activos !== undefined) params.solo_activos = filter.solo_activos;

      const { data } = await apiClient.get<DocumentoResumenItem[]>('/anulaciones/documentos', {
        params,
      });
      documentos.value = data;
    } catch (err) {
      error.value = resolveApiErrorMessage(err, 'Error al consultar documentos');
      documentos.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function anularLote(payload: AnularLotePayload): Promise<{ mensaje: string; total_anulados: number }> {
    isAnulando.value = true;
    try {
      const { data } = await apiClient.post('/anulaciones/lote', payload);
      return data;
    } catch (err) {
      throw new Error(resolveApiErrorMessage(err, 'Error al anular documentos por lote'));
    } finally {
      isAnulando.value = false;
    }
  }

  async function anularIndividual(
    tipo_documento: TipoDocumentoAnulable,
    documento_id: number,
    motivo: string,
    admin_password?: string,
  ): Promise<any> {
    isAnulando.value = true;
    try {
      const { data } = await apiClient.post('/anulaciones/individual', {
        tipo_documento,
        documento_id,
        motivo,
        admin_password,
      });
      return data;
    } catch (err) {
      throw new Error(resolveApiErrorMessage(err, 'Error al anular documento'));
    } finally {
      isAnulando.value = false;
    }
  }

  return {
    documentos,
    isLoading,
    isAnulando,
    error,
    fetchDocumentos,
    anularLote,
    anularIndividual,
  };
});
