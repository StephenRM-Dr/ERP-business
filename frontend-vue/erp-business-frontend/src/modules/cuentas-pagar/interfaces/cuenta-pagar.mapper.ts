import type { CuentaPagar, CuentaPagarUpdateData } from './cuenta-pagar.interface';

/** Raw shape returned by the NestJS `cuentas-pagar` endpoints (backend/src/cuentas-pagar). */
export interface CuentaPagarDto {
  id: number;
  proveedor_id: number;
  tipo_documento: string;
  numero_documento: string;
  compra_id: number | null;
  fecha_emision: string;
  fecha_vencimiento: string;
  monto_original: string;
  saldo_pendiente: string;
  moneda_id: number;
  tasa_cambio: string;
  status: string;
}

/** Payload shape expected by PATCH /cuentas-pagar/:id. */
export interface CuentaPagarUpdateDtoInput {
  status: string;
  saldo_pendiente: number;
}

export function toCuentaPagar(dto: CuentaPagarDto): CuentaPagar {
  return {
    id: String(dto.id),
    proveedorId: dto.proveedor_id,
    tipoDocumento: dto.tipo_documento,
    numeroDocumento: dto.numero_documento,
    compraId: dto.compra_id,
    fechaEmision: dto.fecha_emision,
    fechaVencimiento: dto.fecha_vencimiento,
    montoOriginal: Number(dto.monto_original),
    saldoPendiente: Number(dto.saldo_pendiente),
    monedaId: dto.moneda_id,
    tasaCambio: Number(dto.tasa_cambio),
    status: dto.status,
  };
}

export function toCuentaPagarUpdateDtoInput(data: CuentaPagarUpdateData): CuentaPagarUpdateDtoInput {
  return {
    status: data.status,
    saldo_pendiente: data.saldoPendiente,
  };
}
