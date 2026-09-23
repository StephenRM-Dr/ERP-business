import { IsString, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateNivelPrecioDto {
  @IsString()
  @MaxLength(30)
  nombre: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  factor_utilidad_defecto?: number;
}
