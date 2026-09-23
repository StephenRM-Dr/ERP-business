/**
 * Classifies why stock is moving. Determines whether the movement needs an
 * origin, a destination, or both (see `TRANSFER_CATEGORY_RULES`).
 */
export type TransferCategory =
    | 'NEW_MERCHANDISE' // Ingreso Nuevo de Mercancía: entra de un proveedor, sin ubicación de origen.
    | 'BRANCH_TRANSFER' // Transferencia entre Sucursales: origen y destino.
    | 'INTERNAL_SAMPLES' // Consumo Interno - Muestras y Exhibición: sale del origen, no llega a ningún destino.
    | 'INTERNAL_TECH_TEST' // Consumo Interno - Pruebas Técnicas.
    | 'QUALITY_QUARANTINE' // Control de Calidad (Cuarentena).
    | 'FRACTIONING_LOSS'; // Merma por Fraccionamiento (Cortes).

export const TRANSFER_CATEGORY_RULES: Record<
    TransferCategory,
    { requiresOrigin: boolean; requiresDestination: boolean }
> = {
    NEW_MERCHANDISE: { requiresOrigin: false, requiresDestination: true },
    BRANCH_TRANSFER: { requiresOrigin: true, requiresDestination: true },
    INTERNAL_SAMPLES: { requiresOrigin: true, requiresDestination: false },
    INTERNAL_TECH_TEST: { requiresOrigin: true, requiresDestination: false },
    QUALITY_QUARANTINE: { requiresOrigin: true, requiresDestination: false },
    FRACTIONING_LOSS: { requiresOrigin: true, requiresDestination: false },
};

/**
 * Logistics flow. Stock leaves the origin's sellable quantity as soon as a
 * transfer is REQUESTED (it sits "in transit" — tracked implicitly by the
 * transfer document itself, not by a warehouse record) and only lands in the
 * destination once RECEIVED.
 */
export type StockTransferStatus =
    | 'REQUESTED' // Solicitado / En Preparación
    | 'IN_TRANSIT' // Despachado / En Tránsito
    | 'RECEIVED_PARTIAL' // Recibido Parcial (Con Novedad)
    | 'RECEIVED_CONFIRMED' // Recibido Conforme
    | 'CANCELLED';

export interface StockTransferItem {
    productId: string;
    quantity: number;
    receivedQuantity?: number;
}

/**
 * Movement of stock between two warehouses/branches, or into/out of the
 * business (new merchandise, internal consumption, losses).
 */
export interface StockTransfer {
    id: string;
    code: string;
    category: TransferCategory;
    fromWarehouseId: string | null;
    toWarehouseId: string | null;
    status: StockTransferStatus;
    items: StockTransferItem[];
    notes?: string;
    receptionNotes?: string;
    createdAt: string;
    updatedAt: string;
}

export type StockTransferFormData = Omit<
    StockTransfer,
    'id' | 'code' | 'status' | 'receptionNotes' | 'createdAt' | 'updatedAt'
>;
