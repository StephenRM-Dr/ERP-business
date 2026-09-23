import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RecibosCobrosService } from './recibos-cobro.service';
import { CreateReciboCobroDto } from './dto/create-recibo-cobro.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { resolveSucursalScope } from '../auth/can-view-all-locations';

@ApiTags('recibos-cobro')
@RequirePermission('recibos.cobro')
@Controller('recibos-cobro')
export class RecibosCobrosController {
  constructor(private readonly service: RecibosCobrosService) {}

  @Post() @ApiOperation({ summary: 'Crear recibo de cobro con aplicación a CxC' })
  create(@Body() dto: CreateReciboCobroDto) { return this.service.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar recibos de cobro' })
  @ApiQuery({ name: 'cliente_id', required: false, type: Number })
  @ApiQuery({ name: 'sucursal_id', required: false, type: Number })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('cliente_id') clienteId?: string,
    @Query('sucursal_id') sucursalId?: string,
  ) {
    return this.service.findAll(
      clienteId ? parseInt(clienteId, 10) : undefined,
      resolveSucursalScope(user, sucursalId),
    );
  }

  @Get('cuentas-pendientes')
  @ApiOperation({ summary: 'Listar cuentas por cobrar pendientes de cobro' })
  @ApiQuery({ name: 'cliente_id', required: false, type: Number })
  findCuentasPendientes(@Query('cliente_id') clienteId?: string) {
    return this.service.findCuentasPendientes(
      clienteId ? parseInt(clienteId, 10) : undefined,
    );
  }

  @Get(':id') @ApiOperation({ summary: 'Obtener recibo por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Get(':id/detalles') @ApiOperation({ summary: 'Detalles del recibo (CxC aplicadas)' })
  findDetalles(@Param('id', ParseIntPipe) id: number) { return this.service.findDetalles(id); }
}
