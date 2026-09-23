/**
 * Base interface for a company (tenant-level entity that owns branches).
 */
export interface Empresa {
    id: string;
    nombre: string;
    siglas: string;
    rif: string;
    nit: string;
    direccionFiscal: string;
    direccionDespacho: string;
    telefono: string;
    email: string;
    website: string;
}

/**
 * Fields collected by the create/edit form.
 */
export type EmpresaFormData = Omit<Empresa, 'id'>;
