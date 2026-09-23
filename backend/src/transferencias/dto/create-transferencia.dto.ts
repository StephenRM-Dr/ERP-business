import {
  IsInt,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TransferenciaItemDto {
  @IsInt()
  producto_id: number;

  @IsNumber()
  cantidad_solicitada: number;
}

export class CreateTransferenciaDto {
  @IsString()
  categoria: string;

  @IsOptional()
  @IsInt()
  almacen_origen_id?: number;

  @IsOptional()
  @IsInt()
  almacen_destino_id?: number;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferenciaItemDto)
  items: TransferenciaItemDto[];
}
