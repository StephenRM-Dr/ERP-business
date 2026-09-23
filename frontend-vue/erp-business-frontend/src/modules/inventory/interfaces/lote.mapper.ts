import type { Lote, LoteFormData } from './lote.interface';

/** Raw shape returned by the NestJS `lotes` endpoints (backend/src/lotes). */
export interface LoteDto {
  id: number;
  producto_id: number;
  numero_lote: string;
  fecha_vencimiento: string;
  creado_en?: string;
}

/** Payload shape expected by POST/PATCH /lotes. */
export interface LoteDtoInput {
  producto_id: number;
  numero_lote: string;
  fecha_vencimiento: string;
}

export function toLote(dto: LoteDto): Lote {
  return {
    id: String(dto.id),
    productoId: dto.producto_id,
    numeroLote: dto.numero_lote,
    fechaVencimiento: dto.fecha_vencimiento,
  };
}

export function toLoteDtoInput(data: LoteFormData): LoteDtoInput {
  return {
    producto_id: data.productoId,
    numero_lote: data.numeroLote,
    fecha_vencimiento: data.fechaVencimiento,
  };
}
