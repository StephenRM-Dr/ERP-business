import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductoCostoDto {
  @IsInt()
  moneda_id: number;

  @IsNumber()
  @Min(0)
  costo: number;
}
