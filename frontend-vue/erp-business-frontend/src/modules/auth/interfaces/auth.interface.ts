/**
 * Credentials submitted by the login form.
 */
export interface LoginPayload {
  username: string;
  password: string;
}

/**
 * A permission entry embedded in the login response's user.permisos.
 */
export interface AuthPermiso {
  id: number;
  clavePermiso: string;
  modulo: string;
}

/**
 * Authenticated user profile returned by the backend.
 */
export interface AuthUser {
  id: number;
  username: string;
  nombreCompleto: string;
  email: string;
  rolId: number;
  rolNombre: string;
  sucursalId: number | null;
  empresaId: number | null;
  permisos: AuthPermiso[];
}

/**
 * Response of the login endpoint (POST /auth/login).
 */
export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
