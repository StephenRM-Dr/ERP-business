import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSucursalDto {
  @ApiProperty({ description: 'El ID de la empresa' })
  @IsNumber()
  @Type(() => Number)
  empresa_id: number;

  @ApiProperty({ description: 'El código de la sucursal', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiPropertyOptional({ description: 'Siglas de la sucursal', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  siglas?: string;

  @ApiProperty({ description: 'El nombre de la sucursal', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ description: 'Dirección de la sucursal' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ description: 'Teléfono', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Indica si la sucursal está activa',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
