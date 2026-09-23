import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from './entities/usuario.entity';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('usuarios')
@RequirePermission('master.usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  // Este endpoint maneja la creación segura de usuarios
  @ApiResponse({
    status: 201,
    description: 'El usuario ha sido creado exitosamente.',
    type: Usuario,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - El username o email ya existe.',
  })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios.',
    type: [Usuario],
  })
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':username')
  @ApiOperation({ summary: 'Obtener un usuario por su username' })
  @ApiResponse({
    status: 200,
    description: 'El usuario encontrado.',
    type: Usuario,
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  findOne(@Param('username') username: string) {
    return this.usuariosService.findOne(username);
  }

  @Patch(':username')
  @ApiOperation({ summary: 'Actualizar un usuario por su username' })
  @ApiResponse({
    status: 200,
    description: 'El usuario ha sido actualizado exitosamente.',
    type: Usuario,
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  update(
    @Param('username') username: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(username, updateUsuarioDto);
  }

  @Delete(':username')
  @ApiOperation({ summary: 'Eliminar un usuario por su username' })
  @ApiResponse({
    status: 200,
    description: 'El usuario ha sido eliminado exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  remove(@Param('username') username: string) {
    return this.usuariosService.remove(username);
  }
}
