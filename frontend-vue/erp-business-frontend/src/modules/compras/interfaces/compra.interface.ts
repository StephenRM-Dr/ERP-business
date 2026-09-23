/**
 * One product line within a purchase invoice.
 */
export interface CompraDetalle {
    productoId: number;
    depositoId: number;
    loteId: number | null;
    cantidad: number;
    costoUnitario: number;
    esExento: boolean;
    impuestoPorcentaje: number;
    montoIvaLinea: number;
    netoLinea: number;
}

/**
 * Base interface for a purchase invoice.
 */
export interface Compra {
    id: string;
    sucursalId: number;
    numeroFactura: string;
    proveedorId: number;
    fechaEmision: string;
    fechaVencimiento: string;
    monedaId: number;
    tasaCambio: number;
    status: string;
    totalBruto: number;
    baseExenta: number;
    baseImponible: number;
    montoIva: number;
    igtfPorcentaje: number;
    igtfMonto: number;
    totalNeto: number;
    observaciones: string;
}

/**
 * Payload for POST /compras. `usuarioId` is filled from the logged-in user.
 */
export interface CreateCompraPayload {
    sucursalId: number;
    numeroFactura: string;
    proveedorId: number;
    fechaVencimiento: string;
    monedaId: number;
    tasaCambio: number;
    totalBruto: number;
    baseExenta: number;
    baseImponible: number;
    montoIva: number;
    igtfPorcentaje: number;
    igtfMonto: number;
    totalNeto: number;
    usuarioId: number;
    observaciones: string;
    detalles: CompraDetalle[];
}
