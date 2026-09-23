import { IsString, IsNumber, IsOptional, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCuentaCobrarDto {
  @ApiProperty() @IsNumber() @Type(() => Number) cliente_id: number;
  @ApiProperty() @IsString() @MaxLength(20) tipo_documento: string;
  @ApiProperty() @IsString() @MaxLength(40) numero_documento: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) factura_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) devolucion_id?: number;
  @ApiProperty() @IsDateString() fecha_vencimiento: string;
  @ApiProperty() @IsNumber() @Type(() => Number) monto_original: number;
  @ApiProperty() @IsNumber() @Type(() => Number) saldo_pendiente: number;
  @ApiProperty() @IsNumber() @Type(() => Number) moneda_id: number;
  @ApiProperty() @IsNumber() @Type(() => Number) tasa_cambio: number;
}
