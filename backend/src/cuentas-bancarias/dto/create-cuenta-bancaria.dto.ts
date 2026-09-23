import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCuentaBancariaDto {
  @ApiProperty({ description: 'ID del banco' })
  @IsNumber()
  @Type(() => Number)
  banco_id: number;

  @ApiProperty({ description: 'Número de la cuenta', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  numero_cuenta: string;

  @ApiPropertyOptional({
    description: 'Tipo de cuenta (CORRIENTE, AHORROS, FIDEICOMISO, EXTRANJERA)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['CORRIENTE', 'AHORROS', 'FIDEICOMISO', 'EXTRANJERA'])
  @MaxLength(30)
  tipo_cuenta?: string;

  @ApiProperty({ description: 'ID de la moneda de la cuenta' })
  @IsNumber()
  @Type(() => Number)
  moneda_id: number;

  @ApiPropertyOptional({
    description: 'Descripción de la cuenta',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Saldo conciliado de la cuenta',
    default: 0.0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  saldo_conciliado?: number;

  @ApiPropertyOptional({
    description: 'Indica si la cuenta está activa',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
