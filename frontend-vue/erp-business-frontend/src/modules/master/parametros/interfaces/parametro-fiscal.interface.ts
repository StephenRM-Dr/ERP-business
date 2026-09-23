/**
 * Base interface for a fiscal parameter (tax rate valid over a date range).
 */
export interface ParametroFiscal {
    id: string;
    codigo: string;
    descripcion: string;
    porcentaje: number;
    activo: boolean;
    vigenteDesde: string;
    vigenteHasta: string;
}

/**
 * Fields collected by the create/edit form.
 */
export type ParametroFiscalFormData = Omit<ParametroFiscal, 'id'>;
