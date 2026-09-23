import { IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AplicacionItemDto {
  @ApiProperty({ description: 'ID de la CxC débito (factura o nota de débito) a la que se le descuenta saldo' })
  @IsNumber()
  @Type(() => Number)
  debito_cxc_id: number;

  @ApiProperty({ description: 'Monto a aplicar a esta cuenta débito' })
  @IsNumber()
  @Type(() => Number)
  monto: number;
}

export class AplicarDocumentosCxCDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsNumber()
  @Type(() => Number)
  cliente_id: number;

  @ApiProperty({ description: 'ID del documento de crédito (ADELANTO o NOTA_CREDITO) del que se tomará el saldo' })
  @IsNumber()
  @Type(() => Number)
  credito_cxc_id: number;

  @ApiProperty({ description: 'Lista de aplicaciones contra cuentas débito', type: [AplicacionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AplicacionItemDto)
  aplicaciones: AplicacionItemDto[];

  @ApiProperty({ description: 'ID del usuario autenticado', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  usuario_id?: number;

  @ApiProperty({ description: 'ID de la sucursal', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sucursal_id?: number;
}
