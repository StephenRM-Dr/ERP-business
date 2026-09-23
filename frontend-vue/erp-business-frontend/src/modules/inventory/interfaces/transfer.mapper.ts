import type {
  StockTransfer,
  StockTransferFormData,
  StockTransferStatus,
  TransferCategory,
} from './transfer.interface';

/** Raw shape returned by the NestJS `transferencias` endpoints (backend/src/transferencias). */
export interface TransferenciaDto {
  id: number;
  numero_documento: string;
  categoria: string;
  motivo: string | null;
  almacen_origen_id: number | null;
  almacen_destino_id: number | null;
  estado: string;
  creado_en: string;
  items: {
    producto_id: number;
    cantidad_solicitada: number;
    cantidad_recibida?: number;
  }[];
}

/** Payload shape expected by POST /transferencias. */
export interface TransferenciaDtoInput {
  categoria: string;
  motivo?: string;
  almacen_origen_id?: number;
  almacen_destino_id?: number;
  items: { producto_id: number; cantidad_solicitada: number }[];
}

const BACKEND_STATUS_MAP: Record<string, StockTransferStatus> = {
  REQUESTED: 'REQUESTED',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED_PARTIAL: 'RECEIVED_PARTIAL',
  RECEIVED_CONFIRMED: 'RECEIVED_CONFIRMED',
  CANCELLED: 'CANCELLED',
};

const VALID_CATEGORIES: ReadonlyArray<TransferCategory> = [
  'NEW_MERCHANDISE',
  'BRANCH_TRANSFER',
  'INTERNAL_SAMPLES',
  'INTERNAL_TECH_TEST',
  'QUALITY_QUARANTINE',
  'FRACTIONING_LOSS',
];

function toTransferCategory(categoria: string): TransferCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(categoria)
    ? (categoria as TransferCategory)
    : 'BRANCH_TRANSFER';
}

export function toStockTransfer(dto: TransferenciaDto): StockTransfer {
  return {
    id: String(dto.id),
    code: dto.numero_documento,
    category: toTransferCategory(dto.categoria),
    fromWarehouseId: dto.almacen_origen_id !== null ? String(dto.almacen_origen_id) : null,
    toWarehouseId: dto.almacen_destino_id !== null ? String(dto.almacen_destino_id) : null,
    status: BACKEND_STATUS_MAP[dto.estado] ?? 'REQUESTED',
    items: dto.items.map((item) => ({
      productId: String(item.producto_id),
      quantity: Number(item.cantidad_solicitada),
      receivedQuantity:
        item.cantidad_recibida !== undefined ? Number(item.cantidad_recibida) : undefined,
    })),
    // The backend defaults motivo to the raw categoria string when no free-text
    // reason was given at creation — don't surface that internal fallback as "notes".
    notes: dto.motivo && dto.motivo !== dto.categoria ? dto.motivo : undefined,
    createdAt: dto.creado_en,
    updatedAt: dto.creado_en,
  };
}

export function toTransferenciaDtoInput(data: StockTransferFormData): TransferenciaDtoInput {
  const input: TransferenciaDtoInput = {
    categoria: data.category,
    items: data.items.map((item) => ({
      producto_id: Number(item.productId),
      cantidad_solicitada: item.quantity,
    })),
  };

  if (data.fromWarehouseId !== null) {
    input.almacen_origen_id = Number(data.fromWarehouseId);
  }
  if (data.toWarehouseId !== null) {
    input.almacen_destino_id = Number(data.toWarehouseId);
  }
  if (data.notes && data.notes.trim() !== '') {
    input.motivo = data.notes.trim();
  }

  return input;
}
