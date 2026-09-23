import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ParametrosFiscalesService } from './parametros-fiscales.service';
import { CreateParametroFiscalDto } from './dto/create-parametro-fiscal.dto';
import { UpdateParametroFiscalDto } from './dto/update-parametro-fiscal.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('parametros-fiscales')
@RequirePermission('master.parametros')
@Controller('parametros-fiscales')
export class ParametrosFiscalesController {
  constructor(private readonly service: ParametrosFiscalesService) {}

  @Post() @ApiOperation({ summary: 'Crear parámetro fiscal' })
  create(@Body() dto: CreateParametroFiscalDto) { return this.service.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar parámetros fiscales' })
  findAll() { return this.service.findAll(); }

  @Get(':id') @ApiOperation({ summary: 'Obtener parámetro por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Patch(':id') @ApiOperation({ summary: 'Actualizar parámetro fiscal' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateParametroFiscalDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @ApiOperation({ summary: 'Eliminar parámetro fiscal' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
