import type { Moneda } from './moneda.interface';

/** Raw shape returned by the NestJS `monedas` endpoints (backend/src/monedas). */
export interface MonedaDto {
  id: number;
  codigo_iso: string;
  descripcion: string;
  simbolo: string;
  es_moneda_base: boolean;
  activo: boolean;
}

export function toMoneda(dto: MonedaDto): Moneda {
  return {
    id: dto.id,
    codigoIso: dto.codigo_iso,
    descripcion: dto.descripcion,
    simbolo: dto.simbolo,
    esMonedaBase: dto.es_moneda_base,
    activo: dto.activo,
  };
}
