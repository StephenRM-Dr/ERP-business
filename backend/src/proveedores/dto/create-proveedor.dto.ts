import { IsString, IsOptional, IsBoolean, IsNumber, IsEmail, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProveedorDto {
  @ApiProperty() @IsString() @MaxLength(30) codigo: string;
  @ApiProperty() @IsString() @MaxLength(150) nombre: string;
  @ApiProperty() @IsString() @MaxLength(20) rif: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) nit?: string;
  @ApiProperty() @IsString() direccion: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) telefono?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(100) email?: string;
  @ApiProperty() @IsNumber() @Type(() => Number) moneda_cuenta_id: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) dias_credito?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
}
