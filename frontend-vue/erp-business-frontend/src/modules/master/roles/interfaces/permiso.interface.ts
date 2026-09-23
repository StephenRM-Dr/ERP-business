/**
 * A single permission/module entry from the `permisos` catalog.
 * `clavePermiso` matches an id in src/config/module-catalog.ts.
 */
export interface Permiso {
  id: number;
  clavePermiso: string;
  modulo: string;
  descripcion: string;
}
