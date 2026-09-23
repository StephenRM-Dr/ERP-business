import { IsNumber, IsString, IsOptional, IsBoolean, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateReciboDetalleDto {
  @ApiProperty() @IsNumber() @Type(() => Number) cxc_id: number;
  @ApiProperty() @IsNumber() @Type(() => Number) monto_aplicado: number;
}

export class CreateReciboCobroDto {
  @ApiProperty() @IsNumber() @Type(() => Number) cliente_id: number;
  @ApiProperty() @IsNumber() @Type(() => Number) sucursal_id: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) forma_pago?: string;
  @ApiProperty() @IsNumber() @Type(() => Number) monto_total: number;
  @ApiProperty() @IsNumber() @Type(() => Number) moneda_pago_id: number;
  @ApiProperty() @IsNumber() @Type(() => Number) tasa_cambio: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() aplica_igtf?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) igtf_porcentaje?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) igtf_monto?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) cuenta_bancaria_id?: number;
  @ApiProperty() @IsNumber() @Type(() => Number) usuario_id: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observaciones?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) metodo_pago_id?: number;
  @ApiProperty({ type: [CreateReciboDetalleDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateReciboDetalleDto)
  detalles: CreateReciboDetalleDto[];
}
