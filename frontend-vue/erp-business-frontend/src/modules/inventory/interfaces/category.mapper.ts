import type { Category, CategoryFormData } from './category.interface';

/** Raw shape returned by the NestJS `categorias` endpoints (backend/src/categorias). */
export interface CategoriaDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  creado_en: string;
}

/** Payload shape expected by POST/PATCH /categorias. */
export interface CategoriaDtoInput {
  codigo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export function toCategory(dto: CategoriaDto): Category {
  return {
    id: String(dto.id),
    codigo: dto.codigo,
    nombre: dto.nombre,
    descripcion: dto.descripcion ?? '',
    activo: dto.activo,
    createdAt: dto.creado_en,
  };
}

export function toCategoriaDtoInput(data: CategoryFormData): CategoriaDtoInput {
  return {
    codigo: data.codigo,
    nombre: data.nombre,
    descripcion: data.descripcion,
    activo: data.activo,
  };
}
