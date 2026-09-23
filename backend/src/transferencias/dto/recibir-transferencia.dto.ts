import {
  IsInt,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecibirItemDto {
  @IsInt()
  producto_id: number;

  @IsNumber()
  cantidad_recibida: number;
}

export class RecibirTransferenciaDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecibirItemDto)
  items?: RecibirItemDto[];
}
