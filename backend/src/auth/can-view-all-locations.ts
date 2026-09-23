import type { CurrentUserPayload } from './decorators/current-user.decorator';

/**
 * Quién puede ver datos de sucursales distintas a la propia: el rol 1
 * (Administrador) o cualquier rol con el permiso 'general.viewAllLocations'.
 *
 * Se usa en los listados que de otro modo filtrarían por la sucursal del
 * usuario (facturas, almacenes, stock). El chequeo va en el servidor a
 * propósito: el frontend esconde los filtros, pero un usuario sin el permiso
 * tampoco debe poder pedir otra sucursal llamando la API directo.
 */
export function canViewAllLocations(user: CurrentUserPayload): boolean {
  return user.rolId === 1 || user.permisos.includes('general.viewAllLocations');
}

/**
 * Sucursal a la que hay que acotar un listado: la pedida por query si el
 * usuario tiene permiso, si no la suya. Un usuario sin sucursal asignada
 * (sucursal_id NULL) no se acota — no hay a qué acotarlo.
 */
export function resolveSucursalScope(
  user: CurrentUserPayload,
  requestedSucursalId?: string,
): number | undefined {
  if (canViewAllLocations(user)) {
    return requestedSucursalId ? parseInt(requestedSucursalId, 10) : undefined;
  }
  return user.sucursalId ?? undefined;
}
