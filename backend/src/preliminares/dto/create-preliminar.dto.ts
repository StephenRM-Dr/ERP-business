import { IsIn, IsObject, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { TipoPreliminar } from '../entities/documento-preliminar.entity';

export class CreatePreliminarDto {
  @ApiProperty({ enum: ['FACTURA', 'TRANSFERENCIA'] })
  @IsIn(['FACTURA', 'TRANSFERENCIA'])
  tipo: TipoPreliminar;

  @ApiProperty({ description: 'Nombre del cliente, u "origen → destino"' })
  @IsString()
  @MaxLength(150)
  etiqueta: string;

  /**
   * Estado del formulario. Deliberadamente sin validar campo por campo: la
   * forma la define la pantalla y cambia con ella, y el backend nunca lo
   * interpreta — solo lo guarda y lo devuelve.
   */
  @ApiProperty({ type: Object })
  @IsObject()
  payload: Record<string, any>;
}
