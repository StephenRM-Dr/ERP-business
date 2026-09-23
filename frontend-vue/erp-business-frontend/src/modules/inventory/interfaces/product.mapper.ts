import type { Product, ProductFormData } from './product.interface';

/**
 * Raw shape returned by the NestJS `productos` endpoints (backend/src/productos).
 * `tipo_exencion`, `alicuota_iva_id`, `garantia_meses`, `activar_vendedor_fijo` and
 * `vendedor_fijo_id` are intentionally excluded — agreed with the backend team to
 * drop them from the schema, so they are never mapped here.
 */
export interface ProductoDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion_detallada: string | null;
  categoria_id: number;
  moneda_base_id: number;
  unidad_medida: string | null;
  peso_kg: string;
  activo: boolean;
  creado_en: string;
  referencia: string | null;
  marca: string | null;
  modelo: string | null;
  precio_costo: string | null;
  precio_venta: string | null;
  moneda_venta_id: number | null;
  impuesto_porcentaje: string | null;
  capacidad_contenido: string | null;
  monto_comision: string | null;
  departamento_id: number | null;
  maneja_lotes: boolean;
  maneja_seriales: boolean;
  permite_decimales: boolean;
  sujeto_comision_fija: boolean;
  actualizado_en: string;
  actualizado_por_usuario: { nombre_completo: string } | null;
  precios?: Array<{
    id: number;
    nivel_precio_id: number;
    moneda_id: number;
    precio: string | number;
    activo: boolean;
  }>;
}

/** Payload shape expected by POST/PATCH /productos (numeric fields as numbers, not pg's string form). */
export interface ProductoDtoInput {
  codigo: string;
  nombre: string;
  descripcion_detallada: string;
  categoria_id: number;
  moneda_base_id: number;
  unidad_medida: string;
  peso_kg: number;
  activo: boolean;
  referencia: string;
  marca: string;
  modelo: string;
  // precio_costo/precio_venta/impuesto_porcentaje/capacidad_contenido/monto_comision
  // are NOT NULL columns with a DB default — omitted (not null) when empty, so
  // Postgres applies the default instead of rejecting an explicit null.
  precio_costo?: number;
  precio_venta?: number;
  // moneda_venta_id is a nullable FK column, so null is a valid explicit value.
  moneda_venta_id: number | null;
  impuesto_porcentaje?: number;
  capacidad_contenido?: number;
  monto_comision?: number;
  departamento_id: number | null;
  maneja_lotes: boolean;
  maneja_seriales: boolean;
  permite_decimales: boolean;
  sujeto_comision_fija: boolean;
}

export function toProduct(dto: ProductoDto): Product {
  return {
    id: String(dto.id),
    codigo: dto.codigo,
    nombre: dto.nombre,
    descripcionDetallada: dto.descripcion_detallada ?? '',
    categoriaId: dto.categoria_id,
    monedaBaseId: dto.moneda_base_id,
    unidadMedida: dto.unidad_medida ?? '',
    pesoKg: Number(dto.peso_kg),
    activo: dto.activo,
    createdAt: dto.creado_en,
    referencia: dto.referencia ?? '',
    marca: dto.marca ?? '',
    modelo: dto.modelo ?? '',
    precioCosto: dto.precio_costo != null ? Number(dto.precio_costo) : null,
    precioVenta: dto.precio_venta != null ? Number(dto.precio_venta) : null,
    monedaVentaId: dto.moneda_venta_id ?? null,
    impuestoPorcentaje: dto.impuesto_porcentaje != null ? Number(dto.impuesto_porcentaje) : null,
    capacidadContenido: dto.capacidad_contenido != null ? Number(dto.capacidad_contenido) : null,
    montoComision: dto.monto_comision != null ? Number(dto.monto_comision) : null,
    departamentoId: dto.departamento_id ?? null,
    manejaLotes: dto.maneja_lotes,
    manejaSeriales: dto.maneja_seriales,
    permiteDecimales: dto.permite_decimales,
    sujetoComisionFija: dto.sujeto_comision_fija,
    precios: (dto.precios ?? []).map((p) => ({
      id: p.id,
      nivelPrecioId: p.nivel_precio_id,
      monedaId: p.moneda_id,
      precio: Number(p.precio),
      activo: p.activo,
    })),
    updatedAt: dto.actualizado_en,
    updatedByName: dto.actualizado_por_usuario?.nombre_completo ?? null,
  };
}

export function toProductoDtoInput(data: ProductFormData): ProductoDtoInput {
  const input: ProductoDtoInput = {
    codigo: data.codigo,
    nombre: data.nombre,
    descripcion_detallada: data.descripcionDetallada,
    categoria_id: data.categoriaId,
    moneda_base_id: data.monedaBaseId,
    unidad_medida: data.unidadMedida,
    peso_kg: data.pesoKg,
    activo: data.activo,
    referencia: data.referencia,
    marca: data.marca,
    modelo: data.modelo,
    departamento_id: data.departamentoId,
    maneja_lotes: data.manejaLotes,
    maneja_seriales: data.manejaSeriales,
    permite_decimales: data.permiteDecimales,
    sujeto_comision_fija: data.sujetoComisionFija,
    moneda_venta_id: data.monedaVentaId,
  };

  if (data.precioCosto !== null) {
    input.precio_costo = data.precioCosto;
  }
  if (data.precioVenta !== null) {
    input.precio_venta = data.precioVenta;
  }
  if (data.impuestoPorcentaje !== null) {
    input.impuesto_porcentaje = data.impuestoPorcentaje;
  }
  if (data.capacidadContenido !== null) {
    input.capacidad_contenido = data.capacidadContenido;
  }
  if (data.montoComision !== null) {
    input.monto_comision = data.montoComision;
  }

  return input;
}
