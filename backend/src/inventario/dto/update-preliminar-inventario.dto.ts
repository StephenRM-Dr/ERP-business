import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { TipoPreliminarInventario } from './create-preliminar-inventario.dto';

export class UpdatePreliminarInventarioDto {
  @ApiPropertyOptional({
    description: 'Tipo de movimiento',
    enum: ['INV_CARGO', 'INV_DESCARGO'],
  })
  @IsOptional()
  @IsEnum(['INV_CARGO', 'INV_DESCARGO'])
  tipo?: TipoPreliminarInventario;

  @ApiPropertyOptional({
    description: 'Etiqueta legible para la lista (ej. "Descargo – Papel ahumado")',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  etiqueta?: string;

  @ApiPropertyOptional({
    description: 'Estado del formulario (deposito_id, items, etc.)',
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Sucursal destino',
  })
  @IsOptional()
  @IsInt()
  sucursal_id?: number;
}
