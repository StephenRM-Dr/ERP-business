import { IsString, IsOptional, IsBoolean, IsNumber, MaxLength, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateParametroFiscalDto {
  @ApiProperty() @IsString() @MaxLength(30) codigo: string;
  @ApiProperty() @IsString() @MaxLength(150) descripcion: string;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) porcentaje: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() vigente_desde?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() vigente_hasta?: string;
}
