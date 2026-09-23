import type { StockAdjustmentResult, StockItem, StockMovement } from './stock.interface';

/** Raw shape returned by the NestJS `stock` endpoints (backend/src/stock). */
export interface StockDto {
  id: number;
  producto_id: number;
  almacen_id: number;
  cantidad: number;
  actualizado_en: string;
  /** Only present on PATCH responses that actually recorded a change — see StockService.update(). */
  numero_documento?: string | null;
  motivo?: string | null;
  cantidad_anterior?: number | null;
}

export function toStockItem(dto: StockDto): StockItem {
  return {
    id: String(dto.id),
    productId: String(dto.producto_id),
    warehouseId: String(dto.almacen_id),
    quantity: Number(dto.cantidad),
    // The backend has no minimum-stock-threshold column yet; low-stock
    // detection stays disabled (always 0) until that field exists.
    minQuantity: 0,
    updatedAt: dto.actualizado_en,
  };
}

/** Null when the PATCH didn't actually change the quantity (no document was created). */
export function toStockAdjustmentResult(dto: StockDto): StockAdjustmentResult | null {
  if (dto.cantidad_anterior === undefined || dto.cantidad_anterior === null) {
    return null;
  }
  return {
    documentNumber: dto.numero_documento ?? null,
    reason: dto.motivo ?? null,
    quantityBefore: Number(dto.cantidad_anterior),
    quantityAfter: Number(dto.cantidad),
  };
}

/**
 * Raw shape returned by GET /stock/:id/movimientos — a `Transferencia`
 * (inventario_movimientos) row filtered down to the item for this product.
 */
export interface StockMovimientoDto {
  id: number;
  tipo_movimiento: 'CARGO' | 'DESCARGO' | 'TRANSFERENCIA';
  usuario_id: number;
  usuario_nombre: string | null;
  motivo: string | null;
  fecha_operacion: string;
  numero_documento: string | null;
  items: {
    cantidad: string | number;
    cantidad_recibida: string | number | null;
    cantidad_anterior: string | number | null;
    cantidad_posterior: string | number | null;
  }[];
}

export function toStockMovement(dto: StockMovimientoDto): StockMovement {
  const item = dto.items[0];
  return {
    id: String(dto.id),
    type: dto.tipo_movimiento,
    quantity: Number(item?.cantidad_recibida ?? item?.cantidad ?? 0),
    userId: String(dto.usuario_id),
    userName: dto.usuario_nombre,
    reason: dto.motivo,
    createdAt: dto.fecha_operacion,
    documentNumber: dto.numero_documento,
    quantityBefore: item?.cantidad_anterior !== null && item?.cantidad_anterior !== undefined ? Number(item.cantidad_anterior) : null,
    quantityAfter: item?.cantidad_posterior !== null && item?.cantidad_posterior !== undefined ? Number(item.cantidad_posterior) : null,
  };
}
