import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VendedoresService } from './vendedores.service';
import { CreateVendedorDto } from './dto/create-vendedor.dto';
import { UpdateVendedorDto } from './dto/update-vendedor.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('vendedores')
@Controller('vendedores')
export class VendedoresController {
  constructor(private readonly service: VendedoresService) {}

  @Post()
  @RequirePermission('master.vendedores')
  @ApiOperation({ summary: 'Crear vendedor' })
  create(@Body() dto: CreateVendedorDto) { return this.service.create(dto); }

  @Get()
  @RequirePermission(['master.vendedores', 'invoices', 'recibos.cobro'])
  @ApiOperation({ summary: 'Listar vendedores' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @RequirePermission(['master.vendedores', 'invoices', 'recibos.cobro'])
  @ApiOperation({ summary: 'Obtener vendedor por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Patch(':id')
  @RequirePermission('master.vendedores')
  @ApiOperation({ summary: 'Actualizar vendedor' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVendedorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('master.vendedores')
  @ApiOperation({ summary: 'Eliminar vendedor' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
