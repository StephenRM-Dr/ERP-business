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
import { MonedasService } from './monedas.service';
import { CreateMonedaDto } from './dto/create-moneda.dto';
import { UpdateMonedaDto } from './dto/update-moneda.dto';
import { Moneda } from './entities/moneda.entity';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('monedas')
@Controller('monedas')
export class MonedasController {
  constructor(private readonly monedasService: MonedasService) {}

  @Post()
  @RequirePermission('currencies')
  @ApiOperation({ summary: 'Crear una nueva moneda' })
  @ApiResponse({
    status: 201,
    description: 'La moneda ha sido creada exitosamente.',
    type: Moneda,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - El código ISO de la moneda ya existe.',
  })
  create(@Body() createMonedaDto: CreateMonedaDto) {
    return this.monedasService.create(createMonedaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las monedas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de monedas.',
    type: [Moneda],
  })
  findAll() {
    return this.monedasService.findAll();
  }

  @Get(':codigo_iso')
  @ApiOperation({ summary: 'Obtener una moneda por su código ISO' })
  @ApiResponse({
    status: 200,
    description: 'La moneda encontrada.',
    type: Moneda,
  })
  @ApiResponse({ status: 404, description: 'Moneda no encontrada.' })
  findOne(@Param('codigo_iso') codigo_iso: string) {
    return this.monedasService.findOne(codigo_iso);
  }

  @Patch(':codigo_iso')
  @RequirePermission('currencies')
  @ApiOperation({ summary: 'Actualizar una moneda por su código ISO' })
  @ApiResponse({
    status: 200,
    description: 'La moneda ha sido actualizada exitosamente.',
    type: Moneda,
  })
  @ApiResponse({ status: 404, description: 'Moneda no encontrada.' })
  update(
    @Param('codigo_iso') codigo_iso: string,
    @Body() updateMonedaDto: UpdateMonedaDto,
  ) {
    return this.monedasService.update(codigo_iso, updateMonedaDto);
  }

  @Delete(':codigo_iso')
  @RequirePermission('currencies')
  @ApiOperation({ summary: 'Eliminar una moneda por su código ISO' })
  @ApiResponse({
    status: 200,
    description: 'La moneda ha sido eliminada exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Moneda no encontrada.' })
  remove(@Param('codigo_iso') codigo_iso: string) {
    return this.monedasService.remove(codigo_iso);
  }
}
