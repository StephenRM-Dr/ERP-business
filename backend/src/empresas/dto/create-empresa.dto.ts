import { IsString, IsOptional, MaxLength, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmpresaDto {
  @ApiProperty({ description: 'El nombre de la empresa', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ description: 'Siglas de la empresa', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  siglas?: string;

  @ApiProperty({ description: 'El RIF de la empresa', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  rif: string;

  @ApiPropertyOptional({ description: 'NIT de la empresa', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nit?: string;

  @ApiPropertyOptional({ description: 'Dirección fiscal de la empresa' })
  @IsOptional()
  @IsString()
  direccion_fiscal?: string;

  @ApiPropertyOptional({ description: 'Dirección de despacho' })
  @IsOptional()
  @IsString()
  direccion_despacho?: string;

  @ApiPropertyOptional({ description: 'Teléfono', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional({ description: 'Email', maxLength: 100 })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({ description: 'Sitio Web', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  website?: string;

  @ApiPropertyOptional({
    description: 'Indica si el IGTF está activo para esta empresa',
  })
  @IsOptional()
  igtf_activo?: boolean;

  @ApiPropertyOptional({ description: 'Porcentaje de IGTF' })
  @IsOptional()
  igtf_porcentaje?: number;
}
