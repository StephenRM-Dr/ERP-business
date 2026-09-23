import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEmail,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClienteDto {
  @ApiProperty({ description: 'El nombre del cliente', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  nombre: string;

  @ApiPropertyOptional({
    description: 'El apellido del cliente',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  apellido?: string;

  @ApiPropertyOptional({
    description: 'El tipo de documento del cliente',
    maxLength: 5,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  tipo_documento?: string;

  @ApiPropertyOptional({
    description: 'El número de documento del cliente',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numero_documento?: string;

  @ApiPropertyOptional({
    description: 'El correo electrónico del cliente',
    maxLength: 100,
  })
  @IsOptional()
  @ValidateIf((o) => o.email !== '')
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({
    description: 'El número de teléfono del cliente',
    maxLength: 40,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional({ description: 'El límite de crédito del cliente' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limite_credito?: number;

  @ApiPropertyOptional({ description: 'Los días de crédito del cliente' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  dias_credito?: number;

  @ApiPropertyOptional({ description: 'Notas adicionales sobre el cliente' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({
    description: 'Indica si el cliente es contribuyente especial',
  })
  @IsOptional()
  @IsBoolean()
  contribuyente_especial?: boolean;
}
