import { IsString, IsNumber, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDocumentoCxCDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsNumber()
  @Type(() => Number)
  cliente_id: number;

  @ApiPropertyOptional({ description: 'ID de la sucursal / tienda', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sucursal_id?: number;

  @ApiProperty({ description: 'Tipo de documento', enum: ['FACTURA', 'FACTURA_FINANCIERA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'ADELANTO', 'GIRO', 'AJUSTE'] })
  @IsString()
  @IsIn(['FACTURA', 'FACTURA_FINANCIERA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'ADELANTO', 'GIRO', 'AJUSTE'])
  tipo_documento: 'FACTURA' | 'FACTURA_FINANCIERA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'ADELANTO' | 'GIRO' | 'AJUSTE';

  @ApiProperty({ description: 'Monto del documento' })
  @IsNumber()
  @Type(() => Number)
  monto: number;

  @ApiProperty({ description: 'ID de la moneda' })
  @IsNumber()
  @Type(() => Number)
  moneda_id: number;

  @ApiPropertyOptional({ description: 'Tasa de cambio respecto a la moneda base', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tasa_cambio?: number;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: string;

  @ApiPropertyOptional({ description: 'ID de factura vinculada (opcional para NC/ND)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  factura_id?: number;

  @ApiPropertyOptional({ description: 'ID de CxC específica a la que se le aplica la NC' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cxc_id?: number;

  @ApiPropertyOptional({ description: 'Número de documento manual o de referencia' })
  @IsOptional()
  @IsString()
  numero_documento?: string;

  @ApiPropertyOptional({ description: 'Motivo o justificación' })
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
