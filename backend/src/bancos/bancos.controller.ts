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
import { BancosService } from './bancos.service';
import { CreateBancoDto } from './dto/create-banco.dto';
import { UpdateBancoDto } from './dto/update-banco.dto';
import { Banco } from './entities/banco.entity';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('bancos')
@Controller('bancos')
export class BancosController {
  constructor(private readonly bancosService: BancosService) {}

  @Post()
  @RequirePermission('master.bancos')
  @ApiOperation({ summary: 'Crear un nuevo banco' })
  // Este endpoint maneja el registro central de entidades bancarias
  @ApiResponse({
    status: 201,
    description: 'El banco ha sido creado exitosamente.',
    type: Banco,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - El código del banco ya existe.',
  })
  create(@Body() createBancoDto: CreateBancoDto) {
    return this.bancosService.create(createBancoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los bancos' })
  @ApiResponse({ status: 200, description: 'Lista de bancos.', type: [Banco] })
  findAll() {
    return this.bancosService.findAll();
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Obtener un banco por su código' })
  @ApiResponse({
    status: 200,
    description: 'El banco encontrado.',
    type: Banco,
  })
  @ApiResponse({ status: 404, description: 'Banco no encontrado.' })
  findOne(@Param('codigo') codigo: string) {
    return this.bancosService.findOne(codigo);
  }

  @Patch(':codigo')
  @RequirePermission('master.bancos')
  @ApiOperation({ summary: 'Actualizar un banco por su código' })
  @ApiResponse({
    status: 200,
    description: 'El banco ha sido actualizado exitosamente.',
    type: Banco,
  })
  @ApiResponse({ status: 404, description: 'Banco no encontrado.' })
  update(
    @Param('codigo') codigo: string,
    @Body() updateBancoDto: UpdateBancoDto,
  ) {
    return this.bancosService.update(codigo, updateBancoDto);
  }

  @Delete(':codigo')
  @RequirePermission('master.bancos')
  @ApiOperation({ summary: 'Eliminar un banco por su código' })
  @ApiResponse({
    status: 200,
    description: 'El banco ha sido eliminado exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Banco no encontrado.' })
  remove(@Param('codigo') codigo: string) {
    return this.bancosService.remove(codigo);
  }
}
