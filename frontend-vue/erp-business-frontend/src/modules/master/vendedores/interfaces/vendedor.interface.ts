/**
 * Base interface for a salesperson.
 */
export interface Vendedor {
    id: string;
    codigo: string;
    nombre: string;
    email: string;
    telefono: string;
    comisionPorcentaje: number;
    activo: boolean;
    canal?: string;
    sucursalId?: number | null;
}

/**
 * Fields collected by the create/edit form.
 */
export type VendedorFormData = Omit<Vendedor, 'id'>;
