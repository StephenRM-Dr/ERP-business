import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ClienteItemImportDto {
  @ApiProperty({ description: 'Nombre o Razón Social del cliente' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ description: 'Apellido del cliente' })
  @IsOptional()
  @IsString()
  apellido?: string;

  @ApiPropertyOptional({ description: 'Tipo de documento (V, J, G, E, P)' })
  @IsOptional()
  @IsString()
  tipo_documento?: string;

  @ApiProperty({ description: 'Número de documento o RIF' })
  @IsString()
  numero_documento: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Número de teléfono' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Límite de crédito' })
  @IsOptional()
  @IsNumber()
  limite_credito?: number;

  @ApiPropertyOptional({ description: 'Días de crédito' })
  @IsOptional()
  @IsNumber()
  dias_credito?: number;

  @ApiPropertyOptional({ description: 'Notas o dirección' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ description: 'Indica si es contribuyente especial' })
  @IsOptional()
  @IsBoolean()
  contribuyente_especial?: boolean;
}

export class ImportClientesDto {
  @ApiProperty({ type: [ClienteItemImportDto], description: 'Lista de clientes a importar' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClienteItemImportDto)
  clientes: ClienteItemImportDto[];
}
