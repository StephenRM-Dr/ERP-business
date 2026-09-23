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
import { SucursalesService } from './sucursales.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { Sucursal } from './entities/sucursal.entity';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('sucursales')
@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Post()
  @RequirePermission('master.sucursales')
  @ApiOperation({ summary: 'Crear una nueva sucursal' })
  // Este endpoint maneja el registro de nuevas sucursales vinculadas a empresas
  @ApiResponse({
    status: 201,
    description: 'La sucursal ha sido creada exitosamente.',
    type: Sucursal,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - El código de sucursal ya existe.',
  })
  create(@Body() createSucursalDto: CreateSucursalDto) {
    return this.sucursalesService.create(createSucursalDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las sucursales' })
  @ApiResponse({
    status: 200,
    description: 'Lista de sucursales.',
    type: [Sucursal],
  })
  findAll() {
    return this.sucursalesService.findAll();
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Obtener una sucursal por su código' })
  @ApiResponse({
    status: 200,
    description: 'La sucursal encontrada.',
    type: Sucursal,
  })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada.' })
  findOne(@Param('codigo') codigo: string) {
    return this.sucursalesService.findOne(codigo);
  }

  @Patch(':codigo')
  @RequirePermission('master.sucursales')
  @ApiOperation({ summary: 'Actualizar una sucursal por su código' })
  @ApiResponse({
    status: 200,
    description: 'La sucursal ha sido actualizada exitosamente.',
    type: Sucursal,
  })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada.' })
  update(
    @Param('codigo') codigo: string,
    @Body() updateSucursalDto: UpdateSucursalDto,
  ) {
    return this.sucursalesService.update(codigo, updateSucursalDto);
  }

  @Delete(':codigo')
  @RequirePermission('master.sucursales')
  @ApiOperation({ summary: 'Eliminar una sucursal por su código' })
  @ApiResponse({
    status: 200,
    description: 'La sucursal ha sido eliminada exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada.' })
  remove(@Param('codigo') codigo: string) {
    return this.sucursalesService.remove(codigo);
  }
}
