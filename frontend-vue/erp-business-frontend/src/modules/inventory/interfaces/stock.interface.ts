/**
 * Quantity of a product held at a specific warehouse/branch.
 */
export interface StockItem {
    id: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    minQuantity: number;
    updatedAt: string;
}

/**
 * Audit trail entry affecting a product/warehouse stock row — sourced from
 * the same inventario_movimientos ledger transfers use (CARGO increases it,
 * DESCARGO decreases it, TRANSFERENCIA moves it in or out).
 */
export interface StockMovement {
    id: string;
    type: 'CARGO' | 'DESCARGO' | 'TRANSFERENCIA';
    quantity: number;
    userId: string;
    /** Display name of who made the adjustment/transfer — null for older movements if the user has since been deleted. */
    userName: string | null;
    reason: string | null;
    createdAt: string;
    /** Document number (e.g. "AJ-00000012") — null for older movements recorded before this was tracked. */
    documentNumber: string | null;
    /** Only set for manual adjustments (type CARGO/DESCARGO created via setQuantity), for the printed AJ document. */
    quantityBefore: number | null;
    quantityAfter: number | null;
}

/** Result of a manual stock adjustment (setQuantity) — printable as the AJ audit document when a change was actually recorded. */
export interface StockAdjustmentResult {
    documentNumber: string | null;
    reason: string | null;
    quantityBefore: number;
    quantityAfter: number;
}
