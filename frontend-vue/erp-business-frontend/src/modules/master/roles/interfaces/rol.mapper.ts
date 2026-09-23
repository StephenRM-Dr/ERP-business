import type { Rol, RolFormData } from './rol.interface';
import type { PermisoDto } from './permiso.mapper';

/**
 * Raw shape returned by the NestJS `roles` endpoints (backend/src/roles).
 * `permisos` is only populated by GET /roles/:id — GET /roles (list) omits it.
 */
export interface RolDto {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  permisos?: PermisoDto[];
}

/** Payload shape expected by POST/PATCH /roles. */
export interface RolDtoInput {
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export function toRol(dto: RolDto): Rol {
  return {
    id: String(dto.id),
    nombre: dto.nombre,
    descripcion: dto.descripcion ?? '',
    activo: dto.activo,
    modulosPermitidos: dto.permisos ? dto.permisos.map((permiso) => permiso.clave_permiso) : [],
  };
}

export function toRolDtoInput(data: RolFormData): RolDtoInput {
  return {
    nombre: data.nombre,
    descripcion: data.descripcion,
    activo: data.activo,
  };
}
