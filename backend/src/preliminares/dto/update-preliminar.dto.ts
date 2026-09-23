import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * El tipo no se puede cambiar: un preliminar de factura no se convierte en uno
 * de transferencia. Solo se sobreescriben etiqueta y payload.
 */
export class UpdatePreliminarDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  etiqueta?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
