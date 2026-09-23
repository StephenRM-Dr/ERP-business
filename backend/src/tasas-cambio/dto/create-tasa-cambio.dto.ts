import {
  IsNumber,
  IsOptional,
  IsDateString,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTasaCambioDto {
  @ApiProperty({ description: 'ID de la moneda' })
  @IsNumber()
  @Type(() => Number)
  moneda_id: number;

  @ApiPropertyOptional({
    description: 'Fecha de la tasa (opcional, por defecto es la actual)',
  })
  @IsOptional()
  @IsDateString()
  fecha_tasa?: Date;

  @ApiProperty({ description: 'Factor de cambio' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  factor: number;

  @ApiPropertyOptional({ description: 'ID del usuario que registró la tasa' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  usuario_id?: number;
}
