import type { Proveedor, ProveedorFormData } from './proveedor.interface';

/** Raw shape returned by the NestJS `proveedores` endpoints (backend/src/proveedores). */
export interface ProveedorDto {
  id: number;
  codigo: string;
  nombre: string;
  rif: string;
  nit: string | null;
  direccion: string;
  telefono: string | null;
  email: string | null;
  moneda_cuenta_id: number;
  dias_credito: number;
  saldo_actual: string;
  activo: boolean;
}

/** Payload shape expected by POST/PATCH /proveedores. */
export interface ProveedorDtoInput {
  codigo: string;
  nombre: string;
  rif: string;
  nit?: string;
  direccion: string;
  telefono?: string;
  email?: string;
  moneda_cuenta_id: number;
  dias_credito?: number;
  activo: boolean;
}

export function toProveedor(dto: ProveedorDto): Proveedor {
  return {
    id: String(dto.id),
    codigo: dto.codigo,
    nombre: dto.nombre,
    rif: dto.rif,
    nit: dto.nit ?? '',
    direccion: dto.direccion,
    telefono: dto.telefono ?? '',
    email: dto.email ?? '',
    monedaCuentaId: dto.moneda_cuenta_id,
    diasCredito: dto.dias_credito,
    saldoActual: Number(dto.saldo_actual),
    activo: dto.activo,
  };
}

export function toProveedorDtoInput(data: ProveedorFormData): ProveedorDtoInput {
  return {
    codigo: data.codigo,
    nombre: data.nombre,
    rif: data.rif,
    nit: data.nit || undefined,
    direccion: data.direccion,
    telefono: data.telefono || undefined,
    email: data.email || undefined,
    moneda_cuenta_id: data.monedaCuentaId,
    dias_credito: data.diasCredito,
    activo: data.activo,
  };
}
