import type { Serial, SerialFormData } from './serial.interface';

/** Raw shape returned by the NestJS `seriales` endpoints (backend/src/seriales). */
export interface SerialDto {
  id: number;
  producto_id: number;
  numero_serial: string;
  deposito_id: number | null;
  vendido: boolean;
  creado_en?: string;
}

/** Payload shape expected by POST/PATCH /seriales. */
export interface SerialDtoInput {
  producto_id: number;
  numero_serial: string;
  deposito_id?: number;
  vendido?: boolean;
}

export function toSerial(dto: SerialDto): Serial {
  return {
    id: String(dto.id),
    productoId: dto.producto_id,
    numeroSerial: dto.numero_serial,
    depositoId: dto.deposito_id,
    vendido: dto.vendido,
  };
}

export function toSerialDtoInput(data: SerialFormData): SerialDtoInput {
  return {
    producto_id: data.productoId,
    numero_serial: data.numeroSerial,
    deposito_id: data.depositoId ?? undefined,
    vendido: data.vendido,
  };
}
