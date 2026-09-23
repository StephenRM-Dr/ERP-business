/**
 * Base interface for a supplier account payable (CxP).
 */
export interface CuentaPagar {
    id: string;
    proveedorId: number;
    tipoDocumento: string;
    numeroDocumento: string;
    compraId: number | null;
    fechaEmision: string;
    fechaVencimiento: string;
    montoOriginal: number;
    saldoPendiente: number;
    monedaId: number;
    tasaCambio: number;
    status: string;
}

/**
 * Fields the "edit" screen can change — everything else is set once when
 * the CxP is created (from Compras) and never revisited.
 */
export interface CuentaPagarUpdateData {
    status: string;
    saldoPendiente: number;
}
