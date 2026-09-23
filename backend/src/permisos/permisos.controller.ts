import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PermisosService } from './permisos.service';
import { Permiso } from './entities/permiso.entity';

@ApiTags('permisos')
@Controller('permisos')
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  @Get()
  @ApiOperation({
    summary: 'Catálogo completo de permisos/módulos',
    description:
      'Devuelve los 18 permisos disponibles ordenados por módulo. El frontend usa esta lista para construir los checkboxes del formulario de Roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de permisos.',
    type: [Permiso],
  })
  findAll() {
    return this.permisosService.findAll();
  }
}
