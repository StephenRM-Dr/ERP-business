import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRolDto {
  @ApiProperty({ description: 'El nombre del rol', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción del rol', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Indica si el rol está activo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
