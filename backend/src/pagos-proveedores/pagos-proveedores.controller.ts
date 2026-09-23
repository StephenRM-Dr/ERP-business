import { Controller, Get, Post, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PagosProveedoresService } from './pagos-proveedores.service';
import { CreatePagoProveedorDto } from './dto/create-pago-proveedor.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { resolveSucursalScope } from '../auth/can-view-all-locations';

@ApiTags('pagos-proveedores')
@RequirePermission('pagos.proveedores')
@Controller('pagos-proveedores')
export class PagosProveedoresController {
  constructor(private readonly service: PagosProveedoresService) {}

  @Post() @ApiOperation({ summary: 'Registrar pago a proveedor con aplicación a CxP' })
  create(@Body() dto: CreatePagoProveedorDto) { return this.service.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar pagos a proveedores' })
  @ApiQuery({ name: 'proveedor_id', required: false, type: Number })
  @ApiQuery({ name: 'sucursal_id', required: false, type: Number })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('proveedor_id') proveedorId?: string,
    @Query('sucursal_id') sucursalId?: string,
  ) {
    return this.service.findAll(
      proveedorId ? parseInt(proveedorId, 10) : undefined,
      resolveSucursalScope(user, sucursalId),
    );
  }

  @Get(':id') @ApiOperation({ summary: 'Obtener pago por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Get(':id/detalles') @ApiOperation({ summary: 'Detalles del pago (CxP aplicadas)' })
  findDetalles(@Param('id', ParseIntPipe) id: number) { return this.service.findDetalles(id); }
}
