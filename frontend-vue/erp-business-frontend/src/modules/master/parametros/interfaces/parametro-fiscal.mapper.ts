import type { ParametroFiscal, ParametroFiscalFormData } from './parametro-fiscal.interface';

/** Raw shape returned by the NestJS `parametros-fiscales` endpoints (backend/src/parametros-fiscales). */
export interface ParametroFiscalDto {
  id: number;
  codigo: string;
  descripcion: string;
  porcentaje: string;
  activo: boolean;
  vigente_desde: string;
  vigente_hasta: string | null;
  creado_en?: string;
}

/** Payload shape expected by POST/PATCH /parametros-fiscales. */
export interface ParametroFiscalDtoInput {
  codigo: string;
  descripcion: string;
  porcentaje: number;
  activo: boolean;
  vigente_desde?: string;
  vigente_hasta?: string;
}

export function toParametroFiscal(dto: ParametroFiscalDto): ParametroFiscal {
  return {
    id: String(dto.id),
    codigo: dto.codigo,
    descripcion: dto.descripcion,
    porcentaje: Number(dto.porcentaje),
    activo: dto.activo,
    vigenteDesde: dto.vigente_desde,
    vigenteHasta: dto.vigente_hasta ?? '',
  };
}

export function toParametroFiscalDtoInput(data: ParametroFiscalFormData): ParametroFiscalDtoInput {
  return {
    codigo: data.codigo,
    descripcion: data.descripcion,
    porcentaje: data.porcentaje,
    activo: data.activo,
    vigente_desde: data.vigenteDesde || undefined,
    vigente_hasta: data.vigenteHasta || undefined,
  };
}
