import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiPropertyOptional({ description: 'Nueva cantidad a ajustar' })
  @IsOptional()
  @IsNumber()
  cantidad?: number;

  @ApiPropertyOptional({ description: 'Motivo del ajuste de inventario' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}
