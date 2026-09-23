import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Solo se puede cambiar el status (ANULADA) y las observaciones. */
export class UpdateCompraDto {
  @ApiPropertyOptional({ enum: ['PENDIENTE', 'PAGADA', 'ANULADA'] })
  @IsOptional() @IsString() @MaxLength(20)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observaciones?: string;
}
