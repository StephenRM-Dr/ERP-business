import { useAuthStore } from '@/modules/auth/auth.store';
import { useEmpresaStore } from '@/modules/master/empresas/interfaces/empresa.store';
import { useSucursalStore } from '@/modules/master/sucursales/interfaces/sucursal.store';

/** Membrete de un documento impreso (factura, nota de crédito, transferencia). */
export interface CompanyInfo {
  nombre: string;
  rif: string;
  direccionFiscal: string;
  telefono: string;
  email: string;
  /** Sucursal the document was issued/dispatched from, shown on the membrete instead of the fiscal address. */
  sucursalNombre: string;
}

/**
 * Resuelve el membrete a partir de la sucursal del documento: sucursal ->
 * empresa. Antes cada pantalla tomaba `empresaList[0]`, la primera empresa
 * cargada, así que con más de una empresa registrada todos los documentos
 * salían con el membrete equivocado (una factura despachada desde un almacén
 * de la empresa A se imprimía con el membrete de la empresa B).
 *
 * Sin sucursal se cae a la del usuario, y si tampoco hay, a la única empresa
 * registrada — un membrete de más vale más que un documento sin encabezado.
 */
export function useCompanyInfo() {
  const empresaStore = useEmpresaStore();
  const sucursalStore = useSucursalStore();
  const authStore = useAuthStore();

  /** Carga empresas y sucursales si aún no están; llamar desde onMounted. */
  function ensureLoaded(): void {
    if (empresaStore.empresaList.length === 0) {
      empresaStore.fetchEmpresas();
    }
    if (sucursalStore.sucursalList.length === 0) {
      sucursalStore.fetchSucursales();
    }
  }

  function companyFor(sucursalId: number | string | null | undefined): CompanyInfo | null {
    const resolvedSucursalId =
      sucursalId === null || sucursalId === undefined || sucursalId === ''
        ? authStore.user?.sucursalId ?? null
        : sucursalId;

    const sucursal =
      resolvedSucursalId === null
        ? undefined
        : sucursalStore.getSucursalById(String(resolvedSucursalId));
    const empresa =
      (sucursal ? empresaStore.getEmpresaById(String(sucursal.empresaId)) : undefined) ??
      (empresaStore.empresaList.length === 1 ? empresaStore.empresaList[0] : undefined);

    if (!empresa) {
      return null;
    }
    return {
      nombre: empresa.nombre,
      rif: empresa.rif,
      direccionFiscal: empresa.direccionFiscal ?? '',
      telefono: empresa.telefono ?? '',
      email: empresa.email ?? '',
      sucursalNombre: sucursal?.nombre ?? '',
    };
  }

  return { ensureLoaded, companyFor };
}
