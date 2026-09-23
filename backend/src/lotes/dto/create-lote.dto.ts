import { IsNumber, IsString, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLoteDto {
  @ApiProperty() @IsNumber() @Type(() => Number) producto_id: number;
  @ApiProperty() @IsString() @MaxLength(50) numero_lote: string;
  @ApiProperty() @IsDateString() fecha_vencimiento: string;
}
