import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CuentasPagarService } from './cuentas-pagar.service';
import { CreateCuentaPagarDto } from './dto/create-cuenta-pagar.dto';
import { UpdateCuentaPagarDto } from './dto/update-cuenta-pagar.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('cuentas-pagar')
@RequirePermission('cuentas.pagar')
@Controller('cuentas-pagar')
export class CuentasPagarController {
  constructor(private readonly service: CuentasPagarService) {}

  @Post() @ApiOperation({ summary: 'Crear cuenta por pagar' })
  create(@Body() dto: CreateCuentaPagarDto) { return this.service.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar cuentas por pagar' })
  @ApiQuery({ name: 'proveedor_id', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  findAll(
    @Query('proveedor_id') proveedorId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(
      proveedorId ? parseInt(proveedorId, 10) : undefined,
      status,
    );
  }

  @Get(':id') @ApiOperation({ summary: 'Obtener cuenta por pagar por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Patch(':id') @ApiOperation({ summary: 'Actualizar status o saldo de la cuenta' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCuentaPagarDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @ApiOperation({ summary: 'Eliminar cuenta por pagar' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
