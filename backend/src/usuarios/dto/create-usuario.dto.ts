import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsEmail,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUsuarioDto {
  @ApiProperty({ description: 'El nombre de usuario', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  username: string;

  @ApiProperty({ description: 'Hash de la contraseña', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  clave_hash: string;

  @ApiProperty({
    description: 'El nombre completo del usuario',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  nombre_completo: string;

  @ApiPropertyOptional({ description: 'El email del usuario', maxLength: 100 })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  @Transform(({ value }) => (value === '' ? null : value))
  email?: string;

  @ApiPropertyOptional({ description: 'El ID del rol del usuario' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  rol_id?: number;

  @ApiPropertyOptional({ description: 'El ID de la sucursal del usuario' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sucursal_id?: number;

  @ApiPropertyOptional({
    description: 'Indica si el usuario está activo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
