import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('compras')
@RequirePermission('compras')
@Controller('compras')
export class ComprasController {
  constructor(private readonly service: ComprasService) {}

  @Post() @ApiOperation({ summary: 'Registrar factura de compra con detalles' })
  create(@Body() dto: CreateCompraDto) { return this.service.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar facturas de compra' })
  @ApiQuery({ name: 'proveedor_id', required: false, type: Number })
  @ApiQuery({ name: 'sucursal_id', required: false, type: Number })
  findAll(
    @Query('proveedor_id') proveedorId?: string,
    @Query('sucursal_id') sucursalId?: string,
  ) {
    return this.service.findAll(
      proveedorId ? parseInt(proveedorId, 10) : undefined,
      sucursalId ? parseInt(sucursalId, 10) : undefined,
    );
  }

  @Get(':id') @ApiOperation({ summary: 'Obtener compra por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Get(':id/detalles') @ApiOperation({ summary: 'Detalles de la compra' })
  findDetalles(@Param('id', ParseIntPipe) id: number) { return this.service.findDetalles(id); }

  @Patch(':id') @ApiOperation({ summary: 'Actualizar status/observaciones de la compra' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompraDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/anular') @ApiOperation({ summary: 'Anular factura de compra' })
  anular(@Param('id', ParseIntPipe) id: number) { return this.service.anular(id); }
}
