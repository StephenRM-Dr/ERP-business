import type { PreliminarItem } from '@/modules/preliminares/interfaces/preliminar.interface';

export type TipoPreliminarInventario = 'INV_CARGO' | 'INV_DESCARGO' | 'INV_TRANSFORMACION' | 'INV_AJUSTE';

/**
 * Preliminares de inventario reutilizan la misma tabla `documentos_preliminares`
 * que factura/transferencia (ver preliminar.interface.ts), pero se guardan y
 * aplican por las rutas propias de /inventario (permisos y acción de "aplicar
 * al stock" que el módulo genérico de preliminares no tiene).
 */
export interface InventarioPreliminarPayload {
  depositoId: string;
  items?: PreliminarItem[];
  materialesInsumos?: PreliminarItem[];
  productosTerminados?: PreliminarItem[];
}

export interface InventarioPreliminarSummary {
  id: number;
  numeroDocumento: string;
  tipo: TipoPreliminarInventario;
  etiqueta: string;
  sucursalId: number;
  usuarioId: number;
  itemsCount: number;
  fechaCreacion: string;
  createdAt: string;
}

// --- DTOs del backend (snake_case) ---
// GET /inventario/preliminares devuelve la entidad DocumentoPreliminar cruda
// (ver backend/src/preliminares/entities/documento-preliminar.entity.ts) —
// a diferencia de GET /preliminares, no trae usuario_nombre ni items_count
// resueltos: itemsCount se deriva de payload.items.length en el mapper.

export interface CreatePreliminarInventarioDtoInput {
  tipo: TipoPreliminarInventario;
  etiqueta: string;
  payload: { deposito_id: number; items?: { producto_id: number; cantidad: number }[]; materiales_insumos?: { producto_id: number; cantidad: number }[]; productos_terminados?: { producto_id: number; cantidad: number }[] };
  sucursal_id?: number;
}

export interface DocumentoPreliminarInventarioDto {
  id: number;
  tipo: TipoPreliminarInventario;
  etiqueta: string;
  sucursal_id: number;
  usuario_id: number;
  payload: any;
  creado_en: string;
}

export function toInventarioPreliminarSummary(
  dto: DocumentoPreliminarInventarioDto,
): InventarioPreliminarSummary {
  return {
    id: dto.id,
    numeroDocumento: `PRE-${String(dto.id).padStart(6, '0')}`,
    tipo: dto.tipo,
    etiqueta: dto.etiqueta,
    sucursalId: dto.sucursal_id,
    usuarioId: dto.usuario_id,
    itemsCount: dto.payload?.items?.length ?? dto.payload?.materiales_insumos?.length ?? 0,
    fechaCreacion: dto.creado_en,
    createdAt: dto.creado_en,
  };
}

export function toInventarioPreliminarPayload(
  dto: DocumentoPreliminarInventarioDto,
): InventarioPreliminarPayload {
  return {
    depositoId: String(dto.payload?.deposito_id || dto.payload?.depositoId || '1'),
    items: (dto.payload?.items || []).map((item: any) => ({ productoId: item.productoId ?? item.producto_id, cantidad: item.cantidad })),
  };
}

export function toCreatePreliminarInventarioDtoInput(
  tipo: TipoPreliminarInventario,
  etiqueta: string,
  payload: InventarioPreliminarPayload,
): CreatePreliminarInventarioDtoInput {
  return {
    tipo,
    etiqueta,
    payload: {
      deposito_id: Number(payload.depositoId),
      items: (payload.items || []).map((item) => ({ producto_id: Number(item.productoId), cantidad: item.cantidad })),
    },
  };
}
