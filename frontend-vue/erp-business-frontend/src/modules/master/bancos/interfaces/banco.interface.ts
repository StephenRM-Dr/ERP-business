/**
 * Base interface for a bank.
 */
export interface Banco {
    id: string;
    codigo: string;
    nombre: string;
    activo: boolean;
}

/**
 * Fields collected by the create/edit form.
 */
export type BancoFormData = Omit<Banco, 'id'>;
