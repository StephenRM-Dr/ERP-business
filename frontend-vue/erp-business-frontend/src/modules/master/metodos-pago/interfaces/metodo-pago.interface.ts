/**
 * Base interface for a payment method.
 */
export interface MetodoPago {
    id: string;
    codigo: string;
    nombre: string;
    monedaId: number;
    activo: boolean;
    requiereCuentaBancaria: boolean;
}

/**
 * Fields collected by the create/edit form.
 */
export type MetodoPagoFormData = Omit<MetodoPago, 'id'>;
