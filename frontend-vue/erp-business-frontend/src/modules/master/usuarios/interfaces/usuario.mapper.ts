import type { Usuario, UsuarioFormData } from './usuario.interface';

/** Raw shape returned by the NestJS `usuarios` endpoints (backend/src/usuarios). */
export interface UsuarioDto {
  id: number;
  username: string;
  nombre_completo: string;
  email: string | null;
  rol_id: number | null;
  sucursal_id: number | null;
  activo: boolean;
  rol?: {
    id: number;
    nombre: string;
    permisos?: Array<{ id: number; clave_permiso: string; modulo: string; descripcion: string }>;
  };
  sucursal?: {
    id: number;
    nombre: string;
  };
}

/** Payload shape expected by POST/PATCH /usuarios. */
export interface UsuarioDtoInput {
  username: string;
  nombre_completo: string;
  // Sent only when set — see UsuarioFormData['password'] for why this is a
  // placeholder, not a real credential field, until the backend has auth.
  clave_hash?: string;
  // Omitted (not '') when empty — @IsOptional() only skips validation for a
  // missing key, and an empty string still fails @IsEmail().
  email?: string;
  rol_id: number | null;
  sucursal_id: number | null;
  activo: boolean;
}

export function toUsuario(dto: UsuarioDto): Usuario {
  return {
    id: String(dto.id),
    username: dto.username,
    nombreCompleto: dto.nombre_completo,
    email: dto.email ?? '',
    rolId: dto.rol_id,
    sucursalId: dto.sucursal_id,
    activo: dto.activo,
    rolNombre: dto.rol?.nombre,
    sucursalNombre: dto.sucursal?.nombre,
    permisos: dto.rol?.permisos ? dto.rol.permisos.map((p) => p.clave_permiso) : [],
  };
}

export function toUsuarioDtoInput(data: UsuarioFormData): UsuarioDtoInput {
  return {
    username: data.username,
    nombre_completo: data.nombreCompleto,
    clave_hash: data.password || undefined,
    email: data.email || undefined,
    rol_id: data.rolId,
    sucursal_id: data.sucursalId,
    activo: data.activo,
  };
}
