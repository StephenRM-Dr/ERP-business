import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRolPermisosDto {
  @ApiProperty({
    description:
      'Lista completa de IDs de permisos a asignar al rol (reemplaza el set anterior)',
    type: [Number],
    example: [1, 2, 5],
  })
  @IsArray()
  @IsInt({ each: true })
  permisoIds: number[];
}
