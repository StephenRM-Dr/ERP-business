import type { CreatePagoPayload, CuentaPagarPendiente, PagoProveedor } from './pago-proveedor.interface';

/** Raw shape of a CxP row from GET /cuentas-pagar. */
export interface CuentaPagarPendienteDto {
  id: number;
  proveedor_id: number;
  numero_documento: string;
  fecha_vencimiento: string;
  monto_original: string;
  saldo_pendiente: string;
  moneda_id: number;
}

/** Raw shape returned by GET/POST /pagos-proveedores (backend/src/pagos-proveedores). */
export interface PagoProveedorDto {
  id: number;
  proveedor_id: number;
  sucursal_id: number;
  numero_pago: string;
  fecha_pago: string;
  forma_pago: string;
  monto_total: string;
  moneda_pago_id: number;
  tasa_cambio: string;
  aplica_igtf: boolean;
  igtf_porcentaje: string;
  igtf_monto: string;
  cuenta_bancaria_id: number;
  observaciones: string | null;
}

/** Raw shape of a line from GET /pagos-proveedores/:id/detalles. */
export interface PagoProveedorDetalleDto {
  id: number;
  cxp_id: number;
  monto_aplicado: string;
}

/** Payload shape expected by POST /pagos-proveedores. */
export interface CreatePagoDtoInput {
  proveedor_id: number;
  sucursal_id: number;
  numero_pago: string;
  forma_pago: string;
  monto_total: number;
  moneda_pago_id: number;
  tasa_cambio: number;
  aplica_igtf: boolean;
  igtf_porcentaje: number;
  igtf_monto: number;
  cuenta_bancaria_id: number;
  usuario_id: number;
  observaciones?: string;
  detalles: { cxp_id: number; monto_aplicado: number }[];
}

export function toCuentaPagarPendiente(dto: CuentaPagarPendienteDto): CuentaPagarPendiente {
  return {
    id: String(dto.id),
    proveedorId: dto.proveedor_id,
    numeroDocumento: dto.numero_documento,
    fechaVencimiento: dto.fecha_vencimiento,
    montoOriginal: Number(dto.monto_original),
    saldoPendiente: Number(dto.saldo_pendiente),
    monedaId: dto.moneda_id,
  };
}

export function toPagoProveedor(dto: PagoProveedorDto): PagoProveedor {
  return {
    id: String(dto.id),
    proveedorId: dto.proveedor_id,
    sucursalId: dto.sucursal_id,
    numeroPago: dto.numero_pago,
    fechaPago: dto.fecha_pago,
    formaPago: dto.forma_pago,
    montoTotal: Number(dto.monto_total),
    monedaPagoId: dto.moneda_pago_id,
    tasaCambio: Number(dto.tasa_cambio),
    aplicaIgtf: dto.aplica_igtf,
    igtfPorcentaje: Number(dto.igtf_porcentaje),
    igtfMonto: Number(dto.igtf_monto),
    cuentaBancariaId: dto.cuenta_bancaria_id,
    observaciones: dto.observaciones ?? '',
  };
}

export function toCreatePagoDtoInput(payload: CreatePagoPayload): CreatePagoDtoInput {
  return {
    proveedor_id: payload.proveedorId,
    sucursal_id: payload.sucursalId,
    numero_pago: payload.numeroPago,
    forma_pago: payload.formaPago,
    monto_total: payload.montoTotal,
    moneda_pago_id: payload.monedaPagoId,
    tasa_cambio: payload.tasaCambio,
    aplica_igtf: payload.aplicaIgtf,
    igtf_porcentaje: payload.igtfPorcentaje,
    igtf_monto: payload.igtfMonto,
    cuenta_bancaria_id: payload.cuentaBancariaId,
    usuario_id: payload.usuarioId,
    observaciones: payload.observaciones || undefined,
    detalles: payload.detalles.map((d) => ({ cxp_id: d.cxpId, monto_aplicado: d.montoAplicado })),
  };
}
