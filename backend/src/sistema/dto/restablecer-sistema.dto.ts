import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RestablecerSistemaDto {
  @ApiProperty({
    enum: ['OPERACIONES', 'FABRICA'],
    description: 'Tipo de restablecimiento: OPERACIONES (mantiene maestros) o FABRICA (instalación limpia desde 0)',
  })
  @IsIn(['OPERACIONES', 'FABRICA'])
  tipo: 'OPERACIONES' | 'FABRICA';

  @ApiProperty({
    description: 'Debe contener la palabra "RESTABLECER" en mayúsculas',
    example: 'RESTABLECER',
  })
  @IsString()
  @IsNotEmpty()
  confirmacion: string;
}
