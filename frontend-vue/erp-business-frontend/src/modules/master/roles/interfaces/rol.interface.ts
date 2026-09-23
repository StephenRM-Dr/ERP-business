/**
 * Base interface for a user role.
 */
export interface Rol {
    id: string;
    nombre: string;
    descripcion: string;
    activo: boolean;
    /**
     * Module ids (see src/config/module-catalog.ts) this role can access.
     * Backed by the `permisos` table — see permiso.store.ts and
     * rol.store.ts's ensureRolPermisos/savePermisos.
     */
    modulosPermitidos: string[];
}

/**
 * Fields collected by the create/edit form.
 */
export type RolFormData = Omit<Rol, 'id'>;
