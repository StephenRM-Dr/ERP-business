import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBancoDto {
  @ApiProperty({ description: 'Código del banco', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ description: 'El nombre del banco', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({
    description: 'Indica si el banco está activo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
