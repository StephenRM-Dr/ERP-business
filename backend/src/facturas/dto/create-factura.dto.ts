import {
  IsInt,
  IsArray,
  ValidateNested,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FacturaItemDto {
  @IsInt()
  producto_id: number;

  @IsOptional()
  @IsInt()
  deposito_id?: number;

  @IsNumber()
  cantidad: number;

  @IsNumber()
  precio_unitario: number;

  @IsNumber()
  subtotal: number;

  @IsOptional()
  @IsBoolean()
  es_exento?: boolean;

  @IsOptional()
  @IsNumber()
  impuesto_porcentaje?: number;

  @IsOptional()
  @IsNumber()
  monto_iva_linea?: number;

  @IsOptional()
  @IsNumber()
  costo_operacion?: number;
}

export class FacturaPagoDto {
  @IsString()
  metodo_pago: string;

  @IsNumber()
  monto: number;

  @IsOptional()
  @IsInt()
  cuenta_bancaria_id?: number;

  @IsOptional()
  @IsString()
  moneda_pago_codigo?: string;
}

export class CreateFacturaDto {
  @IsInt()
  cliente_id: number;

  @IsInt()
  moneda_id: number;

  @IsNumber()
  tasa_cambio: number;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  @IsOptional()
  descuento_monto?: number;

  @IsNumber()
  @IsOptional()
  base_imponible?: number;

  @IsNumber()
  @IsOptional()
  base_exenta?: number;

  @IsNumber()
  @IsOptional()
  monto_iva?: number;

  @IsNumber()
  igtf: number;

  @IsNumber()
  total: number;

  @IsOptional()
  @IsIn(['CONTADO', 'CREDITO'])
  condicion_pago?: string;

  @IsOptional()
  @IsInt()
  dias_credito?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsBoolean()
  es_nacional?: boolean;

  @IsOptional()
  @IsInt()
  sucursal_id?: number;

  @IsOptional()
  @IsInt()
  vendedor_id?: number;

  @IsOptional()
  @IsNumber()
  porcentaje_vendedor_1?: number;

  @IsOptional()
  @IsInt()
  vendedor_secundario_id?: number;

  @IsOptional()
  @IsNumber()
  porcentaje_vendedor_2?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacturaItemDto)
  items: FacturaItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacturaPagoDto)
  pagos: FacturaPagoDto[];
}
