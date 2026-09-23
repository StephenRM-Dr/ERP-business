import type { Vendedor, VendedorFormData } from './vendedor.interface';

/** Raw shape returned by the NestJS `vendedores` endpoints (backend/src/vendedores). */
export interface VendedorDto {
  id: number;
  codigo: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  comision_porcentaje: string;
  activo: boolean;
  canal?: string;
  sucursal_id?: number | null;
}

/** Payload shape expected by POST/PATCH /vendedores. */
export interface VendedorDtoInput {
  codigo: string;
  nombre: string;
  email?: string;
  telefono?: string;
  comision_porcentaje?: number;
  activo: boolean;
  canal?: string;
  sucursal_id?: number | null;
}

export function toVendedor(dto: VendedorDto): Vendedor {
  return {
    id: String(dto.id),
    codigo: dto.codigo,
    nombre: dto.nombre,
    email: dto.email ?? '',
    telefono: dto.telefono ?? '',
    comisionPorcentaje: Number(dto.comision_porcentaje),
    activo: dto.activo,
    canal: dto.canal ?? 'TIENDA',
    sucursalId: dto.sucursal_id ?? null,
  };
}

export function toVendedorDtoInput(data: VendedorFormData): VendedorDtoInput {
  return {
    codigo: data.codigo,
    nombre: data.nombre,
    email: data.email || undefined,
    telefono: data.telefono || undefined,
    comision_porcentaje: data.comisionPorcentaje,
    activo: data.activo,
  };
}
