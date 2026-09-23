import { IsNumber, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSerialDto {
  @ApiProperty() @IsNumber() @Type(() => Number) producto_id: number;
  @ApiProperty() @IsString() @MaxLength(100) numero_serial: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) deposito_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() vendido?: boolean;
}
