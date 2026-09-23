import { IsString, IsInt, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class CreateMetodoPagoDto {
  @IsString()
  @MaxLength(20)
  codigo: string;

  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsInt()
  moneda_id: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsBoolean()
  @IsOptional()
  requiere_cuenta_bancaria?: boolean;
}
