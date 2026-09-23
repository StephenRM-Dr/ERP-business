import type { TipoDocumento, TipoDocumentoFormData } from './tipo-documento.interface';

/** Raw shape returned by the NestJS `tipos-documentos` endpoints. */
export interface TipoDocumentoDto {
  id: number;
  sucursal_id: number;
  codigo: string;
  nombre: string;
  correlativo_actual: number;
  longitud_formato: number;
  prefijo: string | null;
  activo: boolean;
}

/** Payload shape expected by POST/PATCH /tipos-documentos. */
export interface TipoDocumentoDtoInput {
  sucursal_id: number;
  codigo: string;
  nombre: string;
  correlativo_actual: number;
  longitud_formato: number;
  prefijo: string;
  activo: boolean;
}

export function toTipoDocumento(dto: TipoDocumentoDto): TipoDocumento {
  return {
    id: String(dto.id),
    sucursalId: dto.sucursal_id,
    codigo: dto.codigo,
    nombre: dto.nombre,
    correlativoActual: dto.correlativo_actual,
    longitudFormato: dto.longitud_formato,
    prefijo: dto.prefijo ?? '',
    activo: dto.activo,
  };
}

export function toTipoDocumentoDtoInput(data: TipoDocumentoFormData): TipoDocumentoDtoInput {
  return {
    sucursal_id: data.sucursalId,
    codigo: data.codigo,
    nombre: data.nombre,
    correlativo_actual: data.correlativoActual,
    longitud_formato: data.longitudFormato,
    prefijo: data.prefijo,
    activo: data.activo,
  };
}
