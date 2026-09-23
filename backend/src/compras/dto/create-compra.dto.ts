import { IsNumber, IsString, IsOptional, IsBoolean, MaxLength, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCompraDetalleDto {
  @ApiProperty() @IsNumber() @Type(() => Number) producto_id: number;
  @ApiProperty() @IsNumber() @Type(() => Number) deposito_id: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) lote_id?: number;
  @ApiProperty() @IsNumber() @Type(() => Number) cantidad: number;
  @ApiProperty() @IsNumber() @Type(() => Number) costo_unitario: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() es_exento?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) impuesto_porcentaje?: number;
  @ApiProperty() @IsNumber() @Type(() => Number) monto_iva_linea: number;
  @ApiProperty() @IsNumber() @Type(() => Number) neto_linea: number;
}

export class CreateCompraDto {
  @ApiProperty() @IsNumber() @Type(() => Number) sucursal_id: number;
  @ApiProperty() @IsString() @MaxLength(40) numero_factura: string;
  @ApiProperty() @IsNumber() @Type(() => Number) proveedor_id: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() fecha_emision?: string;
  @ApiProperty() @IsDateString() fecha_vencimiento: string;
  @ApiProperty() @IsNumber() @Type(() => Number) moneda_id: number;
  @ApiProperty() @IsNumber() @Type(() => Number) tasa_cambio: number;
  @ApiProperty() @IsNumber() @Type(() => Number) total_bruto: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) base_exenta?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) base_imponible?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) monto_iva?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) igtf_porcentaje?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) igtf_monto?: number;
  @ApiProperty() @IsNumber() @Type(() => Number) total_neto: number;
  @ApiProperty() @IsNumber() @Type(() => Number) usuario_id: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observaciones?: string;
  @ApiProperty({ type: [CreateCompraDetalleDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateCompraDetalleDto)
  detalles: CreateCompraDetalleDto[];
}
