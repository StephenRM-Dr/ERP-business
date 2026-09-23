import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ItemTransformacionDobleDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  @IsPositive()
  producto_id: number;

  @ApiPropertyOptional({ description: 'Código del producto' })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional({ description: 'Descripción o nombre del producto' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ description: 'Cantidad consumida o producida' })
  @IsNumber()
  @IsPositive()
  cantidad: number;

  @ApiPropertyOptional({ description: 'Costo unitario' })
  @IsOptional()
  @IsNumber()
  costo_unitario?: number;

  @ApiPropertyOptional({ description: 'Peso unitario en kg' })
  @IsOptional()
  @IsNumber()
  peso_kg?: number;

  @ApiPropertyOptional({ description: 'Unidad de medida' })
  @IsOptional()
  @IsString()
  unidad_medida?: string;
}

export class CreateTransformacionDobleDto {
  @ApiPropertyOptional({
    description: 'ID del depósito/almacén único donde ocurre la transformación (mismo almacén para cargo y descargo)',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  deposito_id?: number;

  @ApiPropertyOptional({
    description: 'ID del depósito origen (de donde salen los materiales a consumir)',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  deposito_origen_id?: number;

  @ApiPropertyOptional({
    description: 'ID del depósito destino (a donde ingresan los productos terminados)',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  deposito_destino_id?: number;

  @ApiProperty({ description: 'Observación o comentario obligatorio de la transformación' })
  @IsNotEmpty({ message: 'La observación o comentario de la transformación es obligatorio.' })
  @IsString()
  observacion: string;

  @ApiPropertyOptional({ description: 'Sucursal. Si se omite se toma del usuario autenticado.' })
  @IsOptional()
  @IsInt()
  sucursal_id?: number;

  @ApiProperty({
    description: 'Lista de materiales a consumir (Módulo 1 / Descargo)',
    type: [ItemTransformacionDobleDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemTransformacionDobleDto)
  materiales_consumir: ItemTransformacionDobleDto[];

  @ApiProperty({
    description: 'Lista de productos a generar (Módulo 2 / Cargo)',
    type: [ItemTransformacionDobleDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemTransformacionDobleDto)
  productos_generar: ItemTransformacionDobleDto[];
}
