import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LotesService } from './lotes.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('lotes')
@RequirePermission('inventory.lotes')
@Controller('lotes')
export class LotesController {
  constructor(private readonly service: LotesService) {}

  @Post() @ApiOperation({ summary: 'Crear lote' })
  create(@Body() dto: CreateLoteDto) { return this.service.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar lotes' })
  @ApiQuery({ name: 'producto_id', required: false, type: Number })
  findAll(@Query('producto_id') productoId?: string) {
    return this.service.findAll(productoId ? parseInt(productoId, 10) : undefined);
  }

  @Get(':id') @ApiOperation({ summary: 'Obtener lote por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Patch(':id') @ApiOperation({ summary: 'Actualizar lote' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLoteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @ApiOperation({ summary: 'Eliminar lote' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
