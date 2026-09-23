/**
 * A CxP open balance, as returned by GET /cuentas-pagar?proveedor_id=&status=PENDIENTE.
 */
export interface CuentaPagarPendiente {
    id: string;
    proveedorId: number;
    numeroDocumento: string;
    fechaVencimiento: string;
    montoOriginal: number;
    saldoPendiente: number;
    monedaId: number;
}

/**
 * Base interface for a supplier payment.
 */
export interface PagoProveedor {
    id: string;
    proveedorId: number;
    sucursalId: number;
    numeroPago: string;
    fechaPago: string;
    formaPago: string;
    montoTotal: number;
    monedaPagoId: number;
    tasaCambio: number;
    aplicaIgtf: boolean;
    igtfPorcentaje: number;
    igtfMonto: number;
    cuentaBancariaId: number;
    observaciones: string;
}

/**
 * Payload for POST /pagos-proveedores. `usuarioId` is filled from the
 * logged-in user, not collected by the form.
 */
export interface CreatePagoPayload {
    proveedorId: number;
    sucursalId: number;
    numeroPago: string;
    formaPago: string;
    montoTotal: number;
    monedaPagoId: number;
    tasaCambio: number;
    aplicaIgtf: boolean;
    igtfPorcentaje: number;
    igtfMonto: number;
    cuentaBancariaId: number;
    usuarioId: number;
    observaciones: string;
    detalles: { cxpId: number; montoAplicado: number }[];
}
