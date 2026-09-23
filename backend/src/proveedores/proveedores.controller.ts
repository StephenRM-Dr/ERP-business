import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('proveedores')
@RequirePermission('master.proveedores')
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}

  @Post() @ApiOperation({ summary: 'Crear proveedor' })
  create(@Body() dto: CreateProveedorDto) { return this.service.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar proveedores' })
  findAll() { return this.service.findAll(); }

  @Get(':id') @ApiOperation({ summary: 'Obtener proveedor por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Patch(':id') @ApiOperation({ summary: 'Actualizar proveedor' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProveedorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @ApiOperation({ summary: 'Eliminar proveedor' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
