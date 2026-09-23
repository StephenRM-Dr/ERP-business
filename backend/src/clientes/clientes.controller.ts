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
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ImportClientesDto } from './dto/import-cliente.dto';
import { Cliente } from './entities/cliente.entity';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('clientes')
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post('importar')
  @RequirePermission('customers')
  @ApiOperation({ summary: 'Importar clientes masivamente desde lote o Excel' })
  importar(@Body() importClientesDto: ImportClientesDto) {
    return this.clientesService.importar(importClientesDto);
  }

  @Post()
  @RequirePermission(['customers', 'invoices'])
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiResponse({
    status: 201,
    description: 'El cliente ha sido creado exitosamente.',
    type: Cliente,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  create(@Body() createClienteDto: CreateClienteDto) {
    return this.clientesService.create(createClienteDto);
  }

  @Get()
  @RequirePermission(['customers', 'invoices', 'recibos.cobro', 'cuentas.cobrar', 'returns', 'compras'])
  @ApiOperation({ summary: 'Obtener todos los clientes' })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes.',
    type: [Cliente],
  })
  findAll() {
    return this.clientesService.findAll();
  }

  @Get(':numero_documento')
  @RequirePermission(['customers', 'invoices', 'recibos.cobro', 'cuentas.cobrar', 'returns', 'compras'])
  @ApiOperation({ summary: 'Obtener un cliente por su número de documento' })
  @ApiResponse({
    status: 200,
    description: 'El cliente encontrado.',
    type: Cliente,
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado.' })
  findOne(@Param('numero_documento') numero_documento: string) {
    return this.clientesService.findOne(numero_documento);
  }

  @Patch(':numero_documento')
  @RequirePermission('customers')
  @ApiOperation({ summary: 'Actualizar un cliente por su número de documento' })
  @ApiResponse({
    status: 200,
    description: 'El cliente ha sido actualizado exitosamente.',
    type: Cliente,
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado.' })
  update(
    @Param('numero_documento') numero_documento: string,
    @Body() updateClienteDto: UpdateClienteDto,
  ) {
    return this.clientesService.update(numero_documento, updateClienteDto);
  }

  @Delete(':numero_documento')
  @RequirePermission('customers')
  @ApiOperation({ summary: 'Eliminar un cliente por su número de documento' })
  @ApiResponse({
    status: 200,
    description: 'El cliente ha sido eliminado exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado.' })
  remove(@Param('numero_documento') numero_documento: string) {
    return this.clientesService.remove(numero_documento);
  }
}
