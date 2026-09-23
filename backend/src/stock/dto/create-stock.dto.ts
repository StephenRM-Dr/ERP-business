import { IsInt, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStockDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  producto_id: number;

  @ApiProperty({ description: 'ID del almacén/depósito' })
  @IsInt()
  almacen_id: number;

  @ApiProperty({ description: 'Cantidad inicial en existencia' })
  @IsNumber()
  cantidad: number;
}
