import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAlmacenDto } from './create-almacen.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAlmacenDto extends PartialType(CreateAlmacenDto) {
  @ApiPropertyOptional({ description: 'Indica si este depósito está habilitado para facturar' })
  @IsOptional()
  @IsBoolean()
  permite_facturar?: boolean;
}

