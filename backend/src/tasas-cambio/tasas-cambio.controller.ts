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
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { TasasCambioService } from './tasas-cambio.service';
import { CreateTasaCambioDto } from './dto/create-tasa-cambio.dto';
import { UpdateTasaCambioDto } from './dto/update-tasa-cambio.dto';
import { TasaCambio } from './entities/tasa-cambio.entity';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('tasas-cambio')
@Controller('tasas-cambio')
export class TasasCambioController {
  constructor(private readonly tasasCambioService: TasasCambioService) {}

  @Post()
  @RequirePermission('exchangeRates')
  @ApiOperation({ summary: 'Crear una nueva tasa de cambio' })
  @ApiResponse({
    status: 201,
    description: 'La tasa de cambio ha sido creada exitosamente.',
    type: TasaCambio,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - Ya existe una tasa para la moneda en esa fecha.',
  })
  create(@Body() createTasaCambioDto: CreateTasaCambioDto) {
    return this.tasasCambioService.create(createTasaCambioDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las tasas de cambio' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tasas de cambio.',
    type: [TasaCambio],
  })
  findAll() {
    return this.tasasCambioService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una tasa de cambio por su ID' })
  @ApiResponse({
    status: 200,
    description: 'La tasa de cambio encontrada.',
    type: TasaCambio,
  })
  @ApiResponse({ status: 404, description: 'Tasa de cambio no encontrada.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasasCambioService.findOne(id);
  }

  @Patch('moneda/:moneda_id')
  @RequirePermission('exchangeRates')
  @ApiOperation({
    summary: 'Actualizar la tasa de cambio más reciente de una moneda',
    description:
      'Busca la última tasa registrada para la moneda especificada en la URL y actualiza sus valores. No envíes el usuario_id si no existe. Lo más común es enviar únicamente el "factor".',
  })
  @ApiBody({
    description: 'Datos a actualizar',
    schema: {
      example: {
        factor: 3300,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'La tasa de cambio ha sido actualizada exitosamente.',
    type: TasaCambio,
  })
  @ApiResponse({
    status: 404,
    description: 'Tasa de cambio no encontrada para esta moneda.',
  })
  updateByMoneda(
    @Param('moneda_id', ParseIntPipe) monedaId: number,
    @Body() updateTasaCambioDto: UpdateTasaCambioDto,
  ) {
    return this.tasasCambioService.updateByMoneda(
      monedaId,
      updateTasaCambioDto,
    );
  }

  @Delete(':id')
  @RequirePermission('exchangeRates')
  @ApiOperation({ summary: 'Eliminar una tasa de cambio por su ID' })
  @ApiResponse({
    status: 200,
    description: 'La tasa de cambio ha sido eliminada exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Tasa de cambio no encontrada.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasasCambioService.remove(id);
  }
}
