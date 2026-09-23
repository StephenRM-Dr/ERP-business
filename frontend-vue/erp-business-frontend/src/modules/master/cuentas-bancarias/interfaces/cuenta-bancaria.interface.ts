/**
 * Base interface for a bank account, owned by a Banco.
 */
export interface CuentaBancaria {
    id: string;
    bancoId: number;
    numeroCuenta: string;
    tipoCuenta: '' | 'CORRIENTE' | 'AHORROS' | 'FIDEICOMISO' | 'EXTRANJERA';
    monedaId: number;
    descripcion: string;
    saldoConciliado: number;
    activo: boolean;
}

/**
 * Fields collected by the create/edit form.
 */
export type CuentaBancariaFormData = Omit<CuentaBancaria, 'id'>;
