/**
 * Base interface for a supplier.
 */
export interface Proveedor {
    id: string;
    codigo: string;
    nombre: string;
    rif: string;
    nit: string;
    direccion: string;
    telefono: string;
    email: string;
    monedaCuentaId: number;
    diasCredito: number;
    saldoActual: number;
    activo: boolean;
}

/**
 * Fields collected by the create/edit form. `saldoActual` is server-managed
 * (updated by compras/pagos-proveedores), so it's excluded here.
 */
export type ProveedorFormData = Omit<Proveedor, 'id' | 'saldoActual'>;
