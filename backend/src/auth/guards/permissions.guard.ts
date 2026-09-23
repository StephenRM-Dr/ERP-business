import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Si es @Public(), no verificamos permisos
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. Leer el permiso requerido de la metadata (handler tiene prioridad sobre clase)
    const requiredPermission = this.reflector.getAllAndOverride<
      string | string[]
    >(REQUIRED_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    // Si no hay @RequirePermission en el handler ni en la clase, permitimos
    if (!requiredPermission) return true;

    // 3. Obtener el usuario del request (puesto por JwtAuthGuard + JwtStrategy)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.rolId) {
      throw new ForbiddenException(
        'No tiene un rol asignado. Contacte al administrador.',
      );
    }

    // 4. Bypass para el super administrador (rol_id = 1)
    if (user.rolId === 1) {
      return true;
    }

    // 5. Los permisos vienen directamente en el payload del JWT
    const permisosDelUsuario: string[] = user.permisos || [];

    // 6. Verificar que el permiso requerido esté en la lista
    const tienePermiso = Array.isArray(requiredPermission)
      ? requiredPermission.some((p) => permisosDelUsuario.includes(p))
      : permisosDelUsuario.includes(requiredPermission);

    if (!tienePermiso) {
      const permisoTexto = Array.isArray(requiredPermission)
        ? requiredPermission.join(' o ')
        : requiredPermission;
      throw new ForbiddenException(
        `No tiene permiso para esta operación (requiere: ${permisoTexto}).`,
      );
    }

    return true;
  }
}
