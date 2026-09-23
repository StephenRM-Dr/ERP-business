import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { TipoTransformacion } from '../entities/inv-regla-transformacion.entity';

// ─── DTO para crear/actualizar una regla ────────────────────────────────────

export class SplitItemDto {
  @ApiProperty({ description: 'ID del producto resultado' })
  @IsInt()
  producto_id: number;

  @ApiProperty({ description: 'Cantidad del producto resultado' })
  @IsNumber()
  @IsPositive()
  cantidad: number;
}

export class CreateReglaTransformacionDto {
  @ApiProperty({ description: 'ID del producto a transformar' })
  @IsInt()
  producto_id: number;

  @ApiProperty({
    description: 'Tipo de transformación',
    enum: ['POR_METRO', 'ROLLO_A_METROS', 'TAZAS', 'HOJILLA_COMBO', 'SPLIT_FIJO'],
  })
  @IsEnum(['POR_METRO', 'ROLLO_A_METROS', 'TAZAS', 'HOJILLA_COMBO', 'SPLIT_FIJO'])
  tipo_transformacion: TipoTransformacion;

  @ApiPropertyOptional({
    description:
      'Factor numérico. Ej: ROLLO_A_METROS→50, TAZAS→36, HOJILLA_COMBO→3. Ignorado en SPLIT_FIJO.',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  factor?: number;

  @ApiPropertyOptional({
    description: 'Ítems de salida para SPLIT_FIJO',
    type: [SplitItemDto],
  })
  @ValidateIf((o) => o.tipo_transformacion === 'SPLIT_FIJO')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitItemDto)
  split_items?: SplitItemDto[];
}

// ─── DTO para ejecutar/calcular una transformación ───────────────────────────

export class EjecutarTransformacionDto {
  @ApiProperty({ description: 'ID del producto a transformar' })
  @IsInt()
  producto_id: number;

  @ApiProperty({ description: 'Cantidad del producto origen a consumir' })
  @IsNumber()
  @IsPositive()
  cantidad_origen: number;

  @ApiProperty({ description: 'ID del depósito/almacén donde se realiza' })
  @IsInt()
  deposito_id: number;

  @ApiPropertyOptional({ description: 'Depósito destino para los ítems resultado (opcional, por defecto = mismo depósito)' })
  @IsOptional()
  @IsInt()
  deposito_destino_id?: number;

  @ApiPropertyOptional({ description: 'Observación libre' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  observacion?: string;
}
