import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_KEY = 'required_permission';

/**
 * Decorador que marca un controller o handler con el permiso requerido.
 * El PermissionsGuard leerá esta metadata y verificará que el usuario
 * tenga ese clave_permiso asignado a su rol.
 *
 * @example
 * @RequirePermission('master.usuarios')
 * @Controller('usuarios')
 * export class UsuariosController { ... }
 */
export const RequirePermission = (...clavesPermisos: (string | string[])[]) => {
  const flattened = clavesPermisos.flat();
  return SetMetadata(
    REQUIRED_PERMISSION_KEY,
    flattened.length === 1 ? flattened[0] : flattened,
  );
};
