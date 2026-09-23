import { IsString, IsNumber, IsOptional, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCuentaPagarDto {
  @ApiProperty() @IsNumber() @Type(() => Number) proveedor_id: number;
  @ApiProperty() @IsString() @MaxLength(20) tipo_documento: string;
  @ApiProperty() @IsString() @MaxLength(40) numero_documento: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) compra_id?: number;
  @ApiProperty() @IsDateString() fecha_vencimiento: string;
  @ApiProperty() @IsNumber() @Type(() => Number) monto_original: number;
  @ApiProperty() @IsNumber() @Type(() => Number) saldo_pendiente: number;
  @ApiProperty() @IsNumber() @Type(() => Number) moneda_id: number;
  @ApiProperty() @IsNumber() @Type(() => Number) tasa_cambio: number;
}
