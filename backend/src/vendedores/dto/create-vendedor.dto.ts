import { IsString, IsOptional, IsBoolean, IsNumber, IsEmail, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVendedorDto {
  @ApiProperty() @IsString() @MaxLength(30) codigo: string;
  @ApiProperty() @IsString() @MaxLength(100) nombre: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(100) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) telefono?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) comision_porcentaje?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
}
