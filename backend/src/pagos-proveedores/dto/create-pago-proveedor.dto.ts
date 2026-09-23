import { IsNumber, IsString, IsOptional, IsBoolean, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePagoDetalleDto {
  @ApiProperty() @IsNumber() @Type(() => Number) cxp_id: number;
  @ApiProperty() @IsNumber() @Type(() => Number) monto_aplicado: number;
}

export class CreatePagoProveedorDto {
  @ApiProperty() @IsNumber() @Type(() => Number) proveedor_id: number;
  @ApiProperty() @IsNumber() @Type(() => Number) sucursal_id: number;
  @ApiProperty() @IsString() @MaxLength(30) numero_pago: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) forma_pago?: string;
  @ApiProperty() @IsNumber() @Type(() => Number) monto_total: number;
  @ApiProperty() @IsNumber() @Type(() => Number) moneda_pago_id: number;
  @ApiProperty() @IsNumber() @Type(() => Number) tasa_cambio: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() aplica_igtf?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) igtf_porcentaje?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) igtf_monto?: number;
  @ApiProperty() @IsNumber() @Type(() => Number) cuenta_bancaria_id: number;
  @ApiProperty() @IsNumber() @Type(() => Number) usuario_id: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observaciones?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) metodo_pago_id?: number;
  @ApiProperty({ type: [CreatePagoDetalleDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePagoDetalleDto)
  detalles: CreatePagoDetalleDto[];
}
