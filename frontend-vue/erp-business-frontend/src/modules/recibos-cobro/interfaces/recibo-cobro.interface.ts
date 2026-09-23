/**
 * A CxC open balance, as returned by GET /recibos-cobro/cuentas-pendientes.
 */
export interface CuentaPendiente {
    id: string;
    clienteId: number;
    numeroDocumento: string;
    fechaVencimiento: string;
    montoOriginal: number;
    saldoPendiente: number;
    monedaId: number;
}

/**
 * One CxC line applied within a recibo.
 */
export interface ReciboCobroDetalle {
    id: string;
    cxcId: number;
    montoAplicado: number;
    cxcNumero?: string;
    cxcTipo?: string;
    cxcMontoOriginal?: number;
    cxcSaldoPendiente?: number;
}

/**
 * Base interface for a recibo de cobro.
 */
export interface ReciboCobro {
    id: string;
    clienteId: number;
    sucursalId: number;
    numeroRecibo: string;
    fechaPago: string;
    formaPago: string;
    montoTotal: number;
    monedaPagoId: number;
    tasaCambio: number;
    aplicaIgtf: boolean;
    igtfPorcentaje: number;
    igtfMonto: number;
    cuentaBancariaId: number | null;
    observaciones: string;
    detalles?: ReciboCobroDetalle[];
}

/**
 * Payload for POST /recibos-cobro. `usuarioId` is filled from the logged-in
 * user, not collected by the form.
 */
export interface CreateReciboPayload {
    clienteId: number;
    sucursalId: number;
    formaPago: string;
    montoTotal: number;
    monedaPagoId: number;
    tasaCambio: number;
    aplicaIgtf: boolean;
    igtfPorcentaje: number;
    igtfMonto: number;
    cuentaBancariaId: number | null;
    usuarioId: number;
    observaciones: string;
    detalles: { cxcId: number; montoAplicado: number }[];
}
