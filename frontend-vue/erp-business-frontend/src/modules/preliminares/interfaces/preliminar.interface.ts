/**
 * Documentos preliminares: borradores imprimibles de una factura de venta o
 * de una transferencia. No tienen correlativo, no reservan stock, y se
 * eliminan cuando el documento real se emite.
 *
 * Ver docs/superpowers/specs/2026-08-07-documentos-preliminares-design.md
 */

export type PreliminarType = 'FACTURA' | 'TRANSFERENCIA' | 'INV_CARGO' | 'INV_DESCARGO';

/** Ítem guardado: solo producto y cantidad — los montos se recalculan al cargar. */
export interface PreliminarItem {
  productoId: number;
  cantidad: number;
}

/** Estado del formulario de Nueva Venta, sin montos ni pagos. */
export interface InvoicePreliminarPayload {
  clienteId: number | null;
  monedaCodigo: string;
  condicionPago: 'CASH' | 'CREDIT';
  diasCredito: number;
  almacenId: number | null;
  notas: string;
  aplicaIva: boolean;
  aplicaIgtf: boolean;
  items: PreliminarItem[];
}

/** Estado del formulario de Nueva Transferencia. */
export interface TransferPreliminarPayload {
  categoria: string;
  almacenOrigenId: number | null;
  almacenDestinoId: number | null;
  motivo: string;
  items: PreliminarItem[];
}

export type PreliminarPayload = InvoicePreliminarPayload | TransferPreliminarPayload;

/** Fila del listado — sin payload, que solo se pide al abrir uno. */
export interface PreliminarSummary {
  id: number;
  type: PreliminarType;
  label: string;
  sucursalId: number;
  userName: string | null;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Preliminar<P = PreliminarPayload> extends PreliminarSummary {
  payload: P;
}

// --- DTOs del backend (snake_case) ---

export interface PreliminarResumenDto {
  id: number;
  tipo: PreliminarType;
  etiqueta: string;
  sucursal_id: number;
  usuario_id: number;
  usuario_nombre: string | null;
  items_count: number;
  creado_en: string;
  actualizado_en: string;
}

export interface PreliminarDto {
  id: number;
  tipo: PreliminarType;
  etiqueta: string;
  sucursal_id: number;
  usuario_id: number;
  payload: PreliminarPayload;
  creado_en: string;
  actualizado_en: string;
}

export function toPreliminarSummary(dto: PreliminarResumenDto): PreliminarSummary {
  return {
    id: dto.id,
    type: dto.tipo,
    label: dto.etiqueta,
    sucursalId: dto.sucursal_id,
    userName: dto.usuario_nombre,
    itemsCount: dto.items_count,
    createdAt: dto.creado_en,
    updatedAt: dto.actualizado_en,
  };
}
