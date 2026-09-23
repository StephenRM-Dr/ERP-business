import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export type TipoPreliminarInventario = 'INV_CARGO' | 'INV_DESCARGO';

/**
 * DTO para guardar un preliminar de inventario.
 * El payload es libre (JSONB) y guarda el estado del formulario
 * sin ejecutar ningún movimiento de stock.
 */
export class CreatePreliminarInventarioDto {
  @ApiProperty({
    description: 'Tipo de movimiento',
    enum: ['INV_CARGO', 'INV_DESCARGO'],
  })
  @IsEnum(['INV_CARGO', 'INV_DESCARGO'])
  tipo: TipoPreliminarInventario;

  @ApiProperty({
    description: 'Etiqueta legible para la lista (ej. "Descargo – Papel ahumado")',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  etiqueta: string;

  @ApiProperty({
    description:
      'Estado del formulario en formato libre (productos, cantidades, depósito, etc.)',
  })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Sucursal destino. Si se omite se toma la del usuario autenticado.',
  })
  @IsOptional()
  @IsInt()
  sucursal_id?: number;
}
