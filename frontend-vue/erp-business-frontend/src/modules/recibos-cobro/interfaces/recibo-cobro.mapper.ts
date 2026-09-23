import type {
  CreateReciboPayload,
  CuentaPendiente,
  ReciboCobro,
  ReciboCobroDetalle,
} from './recibo-cobro.interface';

/** Raw shape of a CxC row from GET /recibos-cobro/cuentas-pendientes. */
export interface CuentaPendienteDto {
  id: number;
  cliente_id: number;
  numero_documento: string;
  fecha_vencimiento: string;
  monto_original: string;
  saldo_pendiente: string;
  moneda_id: number;
}

/** Raw shape returned by GET/POST /recibos-cobro (backend/src/recibos-cobro). */
export interface ReciboCobroDto {
  id: number;
  cliente_id: number;
  sucursal_id: number;
  numero_recibo: string;
  fecha_pago: string;
  forma_pago: string;
  monto_total: string;
  moneda_pago_id: number;
  tasa_cambio: string;
  aplica_igtf: boolean;
  igtf_porcentaje: string;
  igtf_monto: string;
  cuenta_bancaria_id: number | null;
  observaciones: string | null;
}

/** Raw shape of a line from GET /recibos-cobro/:id/detalles. */
export interface ReciboCobroDetalleDto {
  id: number;
  cxc_id: number;
  monto_aplicado: string;
  cxc?: {
    id: number;
    numero_documento?: string;
    tipo_documento?: string;
    monto_original?: string | number;
    saldo_pendiente?: string | number;
  };
}

/** Payload shape expected by POST /recibos-cobro. */
export interface CreateReciboDtoInput {
  cliente_id: number;
  sucursal_id: number;
  forma_pago: string;
  monto_total: number;
  moneda_pago_id: number;
  tasa_cambio: number;
  aplica_igtf: boolean;
  igtf_porcentaje: number;
  igtf_monto: number;
  cuenta_bancaria_id?: number;
  usuario_id: number;
  observaciones?: string;
  detalles: { cxc_id: number; monto_aplicado: number }[];
}

export function toCuentaPendiente(dto: CuentaPendienteDto): CuentaPendiente {
  return {
    id: String(dto.id),
    clienteId: dto.cliente_id,
    numeroDocumento: dto.numero_documento,
    fechaVencimiento: dto.fecha_vencimiento,
    montoOriginal: Number(dto.monto_original),
    saldoPendiente: Number(dto.saldo_pendiente),
    monedaId: dto.moneda_id,
  };
}

export function toReciboCobro(dto: ReciboCobroDto & { detalles?: ReciboCobroDetalleDto[] }): ReciboCobro {
  return {
    id: String(dto.id),
    clienteId: dto.cliente_id,
    sucursalId: dto.sucursal_id,
    numeroRecibo: dto.numero_recibo,
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
    detalles: dto.detalles ? dto.detalles.map(toReciboCobroDetalle) : undefined,
  };
}

export function toReciboCobroDetalle(dto: ReciboCobroDetalleDto): ReciboCobroDetalle {
  return {
    id: String(dto.id),
    cxcId: dto.cxc_id,
    montoAplicado: Number(dto.monto_aplicado),
    cxcNumero: dto.cxc?.numero_documento,
    cxcTipo: dto.cxc?.tipo_documento,
    cxcMontoOriginal: dto.cxc?.monto_original != null ? Number(dto.cxc.monto_original) : undefined,
    cxcSaldoPendiente: dto.cxc?.saldo_pendiente != null ? Number(dto.cxc.saldo_pendiente) : undefined,
  };
}

export function toCreateReciboDtoInput(payload: CreateReciboPayload): CreateReciboDtoInput {
  return {
    cliente_id: payload.clienteId,
    sucursal_id: payload.sucursalId,
    forma_pago: payload.formaPago,
    monto_total: payload.montoTotal,
    moneda_pago_id: payload.monedaPagoId,
    tasa_cambio: payload.tasaCambio,
    aplica_igtf: payload.aplicaIgtf,
    igtf_porcentaje: payload.igtfPorcentaje,
    igtf_monto: payload.igtfMonto,
    cuenta_bancaria_id: payload.cuentaBancariaId ?? undefined,
    usuario_id: payload.usuarioId,
    observaciones: payload.observaciones || undefined,
    detalles: payload.detalles.map((d) => ({ cxc_id: d.cxcId, monto_aplicado: d.montoAplicado })),
  };
}
