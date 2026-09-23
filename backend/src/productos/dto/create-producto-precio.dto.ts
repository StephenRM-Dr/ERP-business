import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductoPrecioDto {
  @IsInt()
  nivel_precio_id: number;

  @IsInt()
  moneda_id: number;

  @IsNumber()
  @Min(0)
  precio: number;
}
