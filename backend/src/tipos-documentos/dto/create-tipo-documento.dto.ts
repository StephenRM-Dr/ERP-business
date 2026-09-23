import { IsString, IsInt, IsOptional, IsBoolean, MaxLength, Min } from 'class-validator';

export class CreateTipoDocumentoDto {
  @IsInt()
  @IsOptional()
  sucursal_id?: number;

  @IsString()
  @MaxLength(10)
  codigo: string;

  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  correlativo_actual?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  longitud_formato?: number;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  prefijo?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
