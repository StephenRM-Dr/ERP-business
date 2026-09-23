import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { Empresa } from './entities/empresa.entity';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('empresas')
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Post()
  @RequirePermission('master.empresas')
  @ApiOperation({ summary: 'Crear una nueva empresa' })
  // Este endpoint maneja el registro central de empresas del sistema
  @ApiResponse({
    status: 201,
    description: 'La empresa ha sido creada exitosamente.',
    type: Empresa,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - El RIF de empresa ya existe.',
  })
  create(@Body() createEmpresaDto: CreateEmpresaDto) {
    return this.empresasService.create(createEmpresaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las empresas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de empresas.',
    type: [Empresa],
  })
  findAll() {
    return this.empresasService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una empresa por su ID' })
  @ApiResponse({
    status: 200,
    description: 'La empresa encontrada.',
    type: Empresa,
  })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.empresasService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('master.empresas', 'igtf')
  @ApiOperation({ summary: 'Actualizar una empresa por su ID' })
  @ApiResponse({
    status: 200,
    description: 'La empresa ha sido actualizada exitosamente.',
    type: Empresa,
  })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEmpresaDto: UpdateEmpresaDto) {
    return this.empresasService.update(id, updateEmpresaDto);
  }

  @Delete(':id')
  @RequirePermission('master.empresas')
  @ApiOperation({ summary: 'Eliminar una empresa por su ID' })
  @ApiResponse({
    status: 200,
    description: 'La empresa ha sido eliminada exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.empresasService.remove(id);
  }
}
