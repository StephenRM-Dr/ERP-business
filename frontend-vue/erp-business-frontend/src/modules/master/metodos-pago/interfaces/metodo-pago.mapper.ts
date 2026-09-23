import type { MetodoPago, MetodoPagoFormData } from './metodo-pago.interface';

/** Raw shape returned by the NestJS `metodos-pago` endpoints (backend/src/metodos-pago). */
export interface MetodoPagoDto {
  id: number;
  codigo: string;
  nombre: string;
  moneda_id: number;
  activo: boolean;
  requiere_cuenta_bancaria: boolean;
}

/** Payload shape expected by POST/PATCH /metodos-pago. */
export interface MetodoPagoDtoInput {
  codigo: string;
  nombre: string;
  moneda_id: number;
  activo: boolean;
  requiere_cuenta_bancaria: boolean;
}

export function toMetodoPago(dto: MetodoPagoDto): MetodoPago {
  return {
    id: String(dto.id),
    codigo: dto.codigo,
    nombre: dto.nombre,
    monedaId: dto.moneda_id,
    activo: dto.activo,
    requiereCuentaBancaria: dto.requiere_cuenta_bancaria,
  };
}

export function toMetodoPagoDtoInput(data: MetodoPagoFormData): MetodoPagoDtoInput {
  return {
    codigo: data.codigo,
    nombre: data.nombre,
    moneda_id: data.monedaId,
    activo: data.activo,
    requiere_cuenta_bancaria: data.requiereCuentaBancaria,
  };
}
