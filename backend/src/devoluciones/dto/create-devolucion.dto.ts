import {
  IsInt,
  IsArray,
  ValidateNested,
  IsNumber,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DevolucionItemDto {
  @IsInt()
  producto_id: number;

  @IsNumber()
  cantidad_devuelta: number;

  @IsInt()
  factura_item_id: number;
}

export class CreateDevolucionDto {
  @IsInt()
  factura_id: number;

  @IsString()
  motivo: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevolucionItemDto)
  items: DevolucionItemDto[];

  /** Requerida cuando el usuario no es administrador (rolId !== 1) */
  @IsOptional()
  @IsString()
  admin_password?: string;
}
