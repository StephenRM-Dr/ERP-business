import { IsNumber, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PagoDirectoDetalleDto {
  @ApiProperty({ description: 'ID de la CxC a la que se le aplica el pago' })
  @IsNumber()
  @Type(() => Number)
  cxc_id: number;

  @ApiProperty({ description: 'Monto a aplicar' })
  @IsNumber()
  @Type(() => Number)
  monto_aplicado: number;
}

export class PagoDirectoCxCDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsNumber()
  @Type(() => Number)
  cliente_id: number;

  @ApiPropertyOptional({ description: 'ID de la sucursal', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sucursal_id?: number;

  @ApiProperty({ description: 'Forma de pago (EFECTIVO, TRANSFERENCIA, PUNTO_VENTA, PAGO_MOVIL, DOLARES, ZELLE, etc.)' })
  @IsString()
  forma_pago: string;

  @ApiProperty({ description: 'Monto total del pago' })
  @IsNumber()
  @Type(() => Number)
  monto_total: number;

  @ApiProperty({ description: 'ID de la moneda de pago' })
  @IsNumber()
  @Type(() => Number)
  moneda_pago_id: number;

  @ApiPropertyOptional({ description: 'Tasa de cambio', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tasa_cambio?: number;

  @ApiPropertyOptional({ description: 'ID de cuenta bancaria destino' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cuenta_bancaria_id?: number;

  @ApiPropertyOptional({ description: 'Observaciones o notas' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ description: 'Detalle de CxC aplicadas', type: [PagoDirectoDetalleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PagoDirectoDetalleDto)
  detalles: PagoDirectoDetalleDto[];
}
