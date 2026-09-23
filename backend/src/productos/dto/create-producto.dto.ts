import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductoDto {
  @ApiProperty({ description: 'El código del producto', maxLength: 30 })
  @IsString()
  @MaxLength(30)
  codigo: string;

  @ApiPropertyOptional({
    description: 'La referencia del producto',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referencia?: string;

  @ApiProperty({ description: 'El nombre del producto', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción detallada del producto' })
  @IsOptional()
  @IsString()
  descripcion_detallada?: string;

  @ApiProperty({ description: 'El ID de la categoría del producto' })
  @IsNumber()
  @Type(() => Number)
  categoria_id: number;

  @ApiPropertyOptional({
    description: 'La unidad de medida del producto',
    default: 'UNIDAD',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidad_medida?: string;

  @ApiPropertyOptional({ description: 'La marca del producto', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  marca?: string;

  @ApiProperty({ description: 'El ID de la moneda base del producto' })
  @IsNumber()
  @Type(() => Number)
  moneda_base_id: number;

  @ApiPropertyOptional({
    description: 'El precio de costo del producto',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precio_costo?: number;

  @ApiPropertyOptional({
    description: 'El precio de venta del producto',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precio_venta?: number;

  @ApiPropertyOptional({
    description: 'El ID de la moneda del precio de venta',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  moneda_venta_id?: number;

  @ApiPropertyOptional({
    description: 'El porcentaje de impuesto del producto',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  impuesto_porcentaje?: number;

  @ApiPropertyOptional({
    description: 'Indica si maneja lotes',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  maneja_lotes?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si maneja seriales',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  maneja_seriales?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si el producto está activo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ description: 'El ID del departamento del producto' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departamento_id?: number;

  @ApiPropertyOptional({
    description: 'El modelo del producto',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo?: string;

  @ApiPropertyOptional({
    description: 'El peso en kg del producto',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  peso_kg?: number;

  @ApiPropertyOptional({
    description: 'La capacidad de contenido del producto',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  capacidad_contenido?: number;

  @ApiPropertyOptional({
    description: 'Indica si permite decimales',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  permite_decimales?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si está sujeto a comisión fija',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sujeto_comision_fija?: boolean;

  @ApiPropertyOptional({ description: 'Monto de comisión', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monto_comision?: number;
}
