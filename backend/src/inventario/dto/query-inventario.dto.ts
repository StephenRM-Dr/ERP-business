import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryInventarioDto {
  @ApiPropertyOptional({
    description:
      'Filtrar por sucursal. Solo disponible para usuarios con inventario.nacional o general.viewAllLocations.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sucursal_id?: number;

  @ApiPropertyOptional({ description: 'Filtrar por depósito/almacén' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  deposito_id?: number;

  @ApiPropertyOptional({ description: 'Filtrar por producto' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_id?: number;

  @ApiPropertyOptional({ description: 'Máx. registros a traer', default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  take?: number;

  @ApiPropertyOptional({ description: 'Offset para paginación', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skip?: number;
}
