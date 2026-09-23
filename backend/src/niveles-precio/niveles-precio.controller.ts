import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NivelesPrecioService } from './niveles-precio.service';
import { CreateNivelPrecioDto } from './dto/create-nivel-precio.dto';
import { UpdateNivelPrecioDto } from './dto/update-nivel-precio.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('niveles-precio')
@Controller('niveles-precio')
export class NivelesPrecioController {
  constructor(private readonly nivelesPrecioService: NivelesPrecioService) {}

  @Post()
  @RequirePermission('inventory.prices')
  @ApiOperation({ summary: 'Crear un nuevo nivel de precio' })
  create(@Body() createNivelPrecioDto: CreateNivelPrecioDto) {
    return this.nivelesPrecioService.create(createNivelPrecioDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los niveles de precio' })
  findAll() {
    return this.nivelesPrecioService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un nivel de precio por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.nivelesPrecioService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('inventory.prices')
  @ApiOperation({ summary: 'Actualizar un nivel de precio' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateNivelPrecioDto: UpdateNivelPrecioDto) {
    return this.nivelesPrecioService.update(id, updateNivelPrecioDto);
  }

  @Delete(':id')
  @RequirePermission('inventory.prices')
  @ApiOperation({ summary: 'Eliminar un nivel de precio' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.nivelesPrecioService.remove(id);
  }
}
