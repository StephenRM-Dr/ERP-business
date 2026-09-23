import type { AuthPermiso, AuthUser, LoginResponse } from './auth.interface';

/** Raw permiso shape embedded in the login response (backend/src/auth). */
export interface AuthPermisoDto {
  id: number;
  clave_permiso: string;
  modulo: string;
}

/** Raw user shape embedded in the login response (backend/src/auth). */
export interface AuthUserDto {
  id: number;
  username: string;
  nombreCompleto: string;
  email: string;
  rolId: number;
  rolNombre: string;
  sucursalId: number | null;
  empresaId: number | null;
  permisos: AuthPermisoDto[];
}

/** Raw shape returned by POST /auth/login. */
export interface LoginResponseDto {
  accessToken: string;
  user: AuthUserDto;
}

function toAuthPermiso(dto: AuthPermisoDto): AuthPermiso {
  return {
    id: dto.id,
    clavePermiso: dto.clave_permiso,
    modulo: dto.modulo,
  };
}

export function toAuthUser(dto: AuthUserDto): AuthUser {
  return {
    id: dto.id,
    username: dto.username,
    nombreCompleto: dto.nombreCompleto,
    email: dto.email,
    rolId: dto.rolId,
    rolNombre: dto.rolNombre,
    sucursalId: dto.sucursalId ?? null,
    empresaId: dto.empresaId ?? null,
    permisos: (dto.permisos ?? []).map(toAuthPermiso),
  };
}

export function toLoginResponse(dto: LoginResponseDto): LoginResponse {
  return {
    accessToken: dto.accessToken,
    user: toAuthUser(dto.user),
  };
}
