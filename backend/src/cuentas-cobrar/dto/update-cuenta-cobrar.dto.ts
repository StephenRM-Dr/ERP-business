import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCuentaCobrarDto {
  @ApiPropertyOptional({ enum: ['PENDIENTE', 'PAGADO', 'ANULADO'] })
  @IsOptional() @IsString() @MaxLength(20)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Type(() => Number)
  saldo_pendiente?: number;
}
