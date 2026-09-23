import type { Sucursal, SucursalFormData } from './sucursal.interface';

/** Raw shape returned by the NestJS `sucursales` endpoints (backend/src/sucursales). */
export interface SucursalDto {
  id: number;
  empresa_id: number;
  codigo: string;
  siglas: string | null;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
}

/** Payload shape expected by POST/PATCH /sucursales. */
export interface SucursalDtoInput {
  empresa_id: number;
  codigo: string;
  siglas: string;
  nombre: string;
  direccion: string;
  telefono: string;
  activo: boolean;
}

export function toSucursal(dto: SucursalDto): Sucursal {
  return {
    id: String(dto.id),
    empresaId: dto.empresa_id,
    codigo: dto.codigo,
    siglas: dto.siglas ?? '',
    nombre: dto.nombre,
    direccion: dto.direccion ?? '',
    telefono: dto.telefono ?? '',
    activo: dto.activo,
  };
}

export function toSucursalDtoInput(data: SucursalFormData): SucursalDtoInput {
  return {
    empresa_id: data.empresaId,
    codigo: data.codigo,
    siglas: data.siglas,
    nombre: data.nombre,
    direccion: data.direccion,
    telefono: data.telefono,
    activo: data.activo,
  };
}
