import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdateRolPermisosDto } from './dto/update-rol-permisos.dto';
import { Rol } from './entities/rol.entity';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('roles')
@RequirePermission('master.roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo rol' })
  // Este endpoint maneja la creación de perfiles de acceso (roles)
  @ApiResponse({
    status: 201,
    description: 'El rol ha sido creado exitosamente.',
    type: Rol,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - El nombre de rol ya existe.',
  })
  create(@Body() createRolDto: CreateRolDto) {
    return this.rolesService.create(createRolDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los roles' })
  @ApiResponse({ status: 200, description: 'Lista de roles.', type: [Rol] })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un rol por su ID (incluye permisos asignados)',
  })
  @ApiResponse({ status: 200, description: 'El rol encontrado.', type: Rol })
  @ApiResponse({ status: 404, description: 'Rol no encontrado.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un rol por su ID' })
  @ApiResponse({
    status: 200,
    description: 'El rol ha sido actualizado exitosamente.',
    type: Rol,
  })
  @ApiResponse({ status: 404, description: 'Rol no encontrado.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRolDto: UpdateRolDto) {
    return this.rolesService.update(id, updateRolDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un rol por su ID' })
  @ApiResponse({
    status: 200,
    description: 'El rol ha sido eliminado exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Rol no encontrado.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }

  @Put(':id/permisos')
  @ApiOperation({
    summary: 'Reemplazar los permisos de un rol',
    description:
      'Recibe la lista completa de IDs de permisos marcados y reemplaza el set anterior. ' +
      'Para quitar todos los permisos enviar permisoIds: [].',
  })
  @ApiResponse({
    status: 200,
    description: 'Permisos del rol actualizados.',
    type: Rol,
  })
  @ApiResponse({ status: 404, description: 'Rol no encontrado.' })
  updatePermisos(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRolPermisosDto) {
    return this.rolesService.updatePermisos(id, dto.permisoIds);
  }
}
