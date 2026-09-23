/**
 * Base interface for a system user.
 */
export interface Usuario {
    id: string;
    username: string;
    nombreCompleto: string;
    email: string;
    rolId: number | null;
    sucursalId: number | null;
    activo: boolean;
    rolNombre?: string;
    sucursalNombre?: string;
    permisos?: string[];
}

/**
 * Fields collected by the create/edit form.
 *
 * `password` stands in for the backend's `clave_hash` column. The backend has
 * no hashing/auth flow yet (see docs/plan-admin-endpoints-frontend.md) — it
 * stores whatever string is sent as-is. Until real auth lands, this is a
 * mockup field only: never treat what's stored here as a secure credential.
 */
export type UsuarioFormData = Omit<Usuario, 'id'> & { password: string };
