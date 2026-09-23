/**
 * Base interface for a branch office, owned by an Empresa.
 */
export interface Sucursal {
    id: string;
    empresaId: number;
    codigo: string;
    /** Defaults to the parent Empresa's siglas when the sucursal is created, editable afterwards. */
    siglas: string;
    nombre: string;
    direccion: string;
    telefono: string;
    activo: boolean;
}

/**
 * Fields collected by the create/edit form.
 */
export type SucursalFormData = Omit<Sucursal, 'id'>;
