import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMonedaDto {
  @ApiProperty({ description: 'El código ISO de la moneda', maxLength: 10 })
  @IsString()
  @MaxLength(10)
  codigo_iso: string;

  @ApiProperty({ description: 'La descripción de la moneda', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  descripcion: string;

  @ApiProperty({ description: 'El símbolo de la moneda', maxLength: 10 })
  @IsString()
  @MaxLength(10)
  simbolo: string;

  @ApiPropertyOptional({
    description: 'Indica si es la moneda base del sistema',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  es_moneda_base?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si la moneda está activa',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
