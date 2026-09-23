import type { Warehouse, WarehouseFormData } from './warehouse.interface';

/** Raw shape returned by the NestJS `almacenes` endpoints (backend/src/almacenes). */
export interface AlmacenDto {
  id: number;
  codigo: string;
  nombre: string;
  responsable: string | null;
  activo: boolean;
  permite_facturar?: boolean;
  sucursal_id: number;
}

/** Payload shape expected by POST/PATCH /almacenes. */
export interface AlmacenDtoInput {
  codigo: string;
  nombre: string;
  responsable: string;
  sucursal_id: number;
  activo: boolean;
  permite_facturar?: boolean;
}

export function toWarehouse(dto: AlmacenDto): Warehouse {
  return {
    id: String(dto.id),
    codigo: dto.codigo,
    name: dto.nombre,
    type: 'WAREHOUSE',
    address: '',
    responsable: dto.responsable ?? '',
    sucursalId: dto.sucursal_id,
    isActive: dto.activo,
    permiteFacturar: dto.permite_facturar ?? true,
    createdAt: '',
    updatedAt: '',
  };
}

export function toAlmacenDtoInput(data: WarehouseFormData): AlmacenDtoInput {
  return {
    codigo: data.codigo,
    nombre: data.name,
    responsable: data.responsable,
    sucursal_id: data.sucursalId,
    activo: data.isActive,
    permite_facturar: data.permiteFacturar ?? true,
  };
}
