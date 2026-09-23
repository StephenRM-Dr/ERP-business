import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SerialesService } from './seriales.service';
import { CreateSerialDto } from './dto/create-serial.dto';
import { UpdateSerialDto } from './dto/update-serial.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('seriales')
@RequirePermission('inventory.seriales')
@Controller('seriales')
export class SerialesController {
  constructor(private readonly service: SerialesService) {}

  @Post() @ApiOperation({ summary: 'Registrar serial' })
  create(@Body() dto: CreateSerialDto) { return this.service.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar seriales' })
  @ApiQuery({ name: 'producto_id', required: false, type: Number })
  @ApiQuery({ name: 'deposito_id', required: false, type: Number })
  findAll(
    @Query('producto_id') productoId?: string,
    @Query('deposito_id') depositoId?: string,
  ) {
    return this.service.findAll(
      productoId ? parseInt(productoId, 10) : undefined,
      depositoId ? parseInt(depositoId, 10) : undefined,
    );
  }

  @Get(':id') @ApiOperation({ summary: 'Obtener serial por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Patch(':id') @ApiOperation({ summary: 'Actualizar serial' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSerialDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @ApiOperation({ summary: 'Eliminar serial' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
