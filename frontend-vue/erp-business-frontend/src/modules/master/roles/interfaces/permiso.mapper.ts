import type { Permiso } from './permiso.interface';

/** Raw shape returned by GET /permisos (backend/src/permisos). */
export interface PermisoDto {
  id: number;
  clave_permiso: string;
  modulo: string;
  descripcion: string | null;
}

export function toPermiso(dto: PermisoDto): Permiso {
  return {
    id: dto.id,
    clavePermiso: dto.clave_permiso,
    modulo: dto.modulo,
    descripcion: dto.descripcion ?? '',
  };
}
