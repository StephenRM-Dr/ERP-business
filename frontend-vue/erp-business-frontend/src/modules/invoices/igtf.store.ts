import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import apiClient from '@/api/axios-client';
import { useAuthStore } from '@/modules/auth/auth.store';

export interface EmpresaIgtfItem {
  id: number;
  nombre: string;
  rif: string;
  igtf_activo: boolean;
  igtf_porcentaje: number;
}

/**
 * IGTF (Impuesto a las Grandes Transacciones Financieras): Venezuelan tax
 * applied when an invoice is paid in a currency other than VES.
 *
 * Backed by `empresas.igtf_activo`/`igtf_porcentaje`.
 * Supports configuring IGTF for all registered companies in the system.
 */
export const useIgtfStore = defineStore('igtf', () => {
  const empresas = ref<EmpresaIgtfItem[]>([]);
  const selectedEmpresaId = ref<number | null>(null);
  const isLoaded = ref(false);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const error = ref<string | null>(null);

  const authStore = useAuthStore();

  const activeEmpresa = computed<EmpresaIgtfItem | null>(() => {
    if (empresas.value.length === 0) return null;
    const targetId = selectedEmpresaId.value ?? authStore.user?.empresaId ?? null;
    if (targetId !== null) {
      const found = empresas.value.find((e) => e.id === Number(targetId));
      if (found) return found;
    }
    return empresas.value[0] || null;
  });

  const isEnabled = computed<boolean>(() => activeEmpresa.value?.igtf_activo ?? false);
  const ratePercent = computed<number>(() => Number(activeEmpresa.value?.igtf_porcentaje) || 0);

  function resolveTargetEmpresaId(empresaId?: number): number | null {
    if (empresaId) return empresaId;
    if (activeEmpresa.value) return activeEmpresa.value.id;
    if (authStore.user?.empresaId) return authStore.user.empresaId;
    if (empresas.value.length > 0 && empresas.value[0]) return empresas.value[0].id;
    return null;
  }

  async function fetchIgtf(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await apiClient.get<any[]>('/empresas');
      empresas.value = (data || []).map((e) => ({
        id: Number(e.id),
        nombre: e.nombre || `Empresa #${e.id}`,
        rif: e.rif || '',
        igtf_activo: Boolean(e.igtf_activo),
        igtf_porcentaje: Number(e.igtf_porcentaje) || 0,
      }));

      // Seleccionar empresa inicial
      if (!selectedEmpresaId.value) {
        if (authStore.user?.empresaId) {
          selectedEmpresaId.value = Number(authStore.user.empresaId);
        } else if (empresas.value.length > 0 && empresas.value[0]) {
          selectedEmpresaId.value = empresas.value[0].id;
        }
      }

      isLoaded.value = true;
    } catch {
      error.value = 'igtf.fetchError';
    } finally {
      isLoading.value = false;
    }
  }

  async function setRate(newRatePercent: number, empresaId?: number): Promise<void> {
    if (newRatePercent < 0 || newRatePercent > 100) {
      return;
    }
    const targetId = resolveTargetEmpresaId(empresaId);
    if (targetId === null) {
      return;
    }

    const item = empresas.value.find((e) => e.id === targetId);
    const previous = item ? item.igtf_porcentaje : 0;
    if (item) item.igtf_porcentaje = newRatePercent;

    error.value = null;
    isSaving.value = true;
    try {
      await apiClient.patch(`/empresas/${targetId}`, { igtf_porcentaje: newRatePercent });
    } catch {
      if (item) item.igtf_porcentaje = previous;
      error.value = 'igtf.saveError';
    } finally {
      isSaving.value = false;
    }
  }

  async function toggleEnabled(empresaId?: number): Promise<void> {
    const targetId = resolveTargetEmpresaId(empresaId);
    if (targetId === null) {
      return;
    }

    const item = empresas.value.find((e) => e.id === targetId);
    if (!item) return;

    const previous = item.igtf_activo;
    item.igtf_activo = !previous;

    error.value = null;
    isSaving.value = true;
    try {
      await apiClient.patch(`/empresas/${targetId}`, { igtf_activo: item.igtf_activo });
    } catch {
      item.igtf_activo = previous;
      error.value = 'igtf.saveError';
    } finally {
      isSaving.value = false;
    }
  }

  return {
    empresas,
    selectedEmpresaId,
    activeEmpresa,
    isEnabled,
    ratePercent,
    isLoaded,
    isLoading,
    isSaving,
    error,
    fetchIgtf,
    setRate,
    toggleEnabled,
  };
});
