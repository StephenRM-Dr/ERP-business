/**
 * Base interface for a product category.
 */
export interface Category {
    id: string;
    codigo: string;
    nombre: string;
    descripcion: string;
    activo: boolean;
    createdAt: string;
}

/**
 * Fields collected by the create/edit form.
 */
export type CategoryFormData = Omit<Category, 'id' | 'createdAt'>;
