import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FacturasService } from './facturas.service';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { AnularFacturaDto } from './dto/anular-factura.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import {
  canViewAllLocations,
  resolveSucursalScope,
} from '../auth/can-view-all-locations';

@ApiTags('facturas')
@RequirePermission('invoices')
@Controller('facturas')
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Post()
  create(
    @Body() createFacturaDto: CreateFacturaDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const canSellWithoutStock =
      user.rolId === 1 || user.permisos.includes('invoices.sellWithoutStock');
    const sucursalTarget = createFacturaDto.sucursal_id ?? user.sucursalId ?? undefined;
    return this.facturasService.create(
      createFacturaDto,
      user.id,
      sucursalTarget,
      canSellWithoutStock,
    );
  }

  @Get()
  @ApiQuery({ name: 'sucursal_id', required: false, type: Number })
  @ApiQuery({ name: 'empresa_id', required: false, type: Number })
  @ApiQuery({ name: 'condicion_pago', required: false, enum: ['CONTADO', 'CREDITO'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'vendedor_ids', required: false, type: String, description: 'Comma-separated vendedor IDs' })
  @ApiQuery({ name: 'usuario_ids', required: false, type: String, description: 'Comma-separated usuario IDs' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('sucursal_id') sucursalId?: string,
    @Query('empresa_id') empresaId?: string,
    @Query('condicion_pago') condicionPago?: 'CONTADO' | 'CREDITO',
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('vendedor_ids') vendedorIdsQuery?: string,
    @Query('usuario_ids') usuarioIdsQuery?: string,
  ) {
    // A user without the permission is always pinned to their own sucursal —
    // any sucursal_id/empresa_id they try to pass is ignored, not just hidden by the UI.
    const scopedSucursalId = resolveSucursalScope(user, sucursalId);
    const scopedEmpresaId =
      canViewAllLocations(user) && empresaId
        ? parseInt(empresaId, 10)
        : undefined;

    const take = pageSize ? Math.max(1, parseInt(pageSize, 10)) : undefined;
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;

    const vendedorIds = vendedorIdsQuery
      ? vendedorIdsQuery.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
      : undefined;
    const usuarioIds = usuarioIdsQuery
      ? usuarioIdsQuery.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
      : undefined;

    return this.facturasService.findAll({
      sucursalId: scopedSucursalId,
      empresaId: scopedEmpresaId,
      condicionPago,
      search,
      vendedorIds,
      usuarioIds,
      ...(take ? { take, skip: (pageNum - 1) * take } : {}),
    });
  }

  @Get('proximo-correlativo')
  @ApiOperation({
    summary: 'Preview del próximo número de factura',
    description:
      'Devuelve el próximo correlativo formateado (prefijo + número con padding) ' +
      'sin consumir el contador. Solo lectura — seguro de llamar múltiples veces. ' +
      'Admins pueden pasar ?sucursal_id para ver el correlativo de otra sucursal.',
  })
  @ApiQuery({ name: 'sucursal_id', required: false, type: Number })
  @ApiQuery({ name: 'es_nacional', required: false, type: Boolean })
  @ApiResponse({ status: 200, schema: { example: { numero: 'FAC-00000043' } } })
  @ApiResponse({ status: 404, description: 'No hay tipo de documento FAC activo para esa sucursal' })
  previewCorrelativo(
    @CurrentUser() user: CurrentUserPayload,
    @Query('sucursal_id') sucursalIdQuery?: string,
    @Query('es_nacional') esNacionalQuery?: string,
  ) {
    const esNacional = esNacionalQuery === 'true';
    const sucursalId = canViewAllLocations(user) && sucursalIdQuery
      ? parseInt(sucursalIdQuery, 10)
      : (user.sucursalId ?? null);
    return this.facturasService.previewCorrelativo(sucursalId, esNacional);
  }

  @Get('reporte-diario')
  @ApiOperation({
    summary: 'Reporte de Ventas Diarias con Cierre de Operaciones, CxC, Transacciones y Formas de Pago',
  })
  @ApiQuery({ name: 'fecha', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'fecha_desde', required: false, type: String })
  @ApiQuery({ name: 'fecha_hasta', required: false, type: String })
  @ApiQuery({ name: 'sucursal_id', required: false, type: Number })
  @ApiQuery({ name: 'empresa_id', required: false, type: Number })
  @ApiQuery({ name: 'moneda_id', required: false, type: Number })
  @ApiQuery({ name: 'vendedor_ids', required: false, type: String, description: 'Comma-separated vendedor IDs' })
  @ApiQuery({ name: 'usuario_ids', required: false, type: String, description: 'Comma-separated usuario IDs' })
  getReporteDiario(
    @CurrentUser() user: CurrentUserPayload,
    @Query('fecha') fecha?: string,
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
    @Query('sucursal_id') sucursalIdQuery?: string,
    @Query('empresa_id') empresaIdQuery?: string,
    @Query('moneda_id') monedaIdQuery?: string,
    @Query('vendedor_ids') vendedorIdsQuery?: string,
    @Query('usuario_ids') usuarioIdsQuery?: string,
  ) {
    const scopedSucursalId = resolveSucursalScope(user, sucursalIdQuery);
    const scopedEmpresaId =
      canViewAllLocations(user) && empresaIdQuery
        ? parseInt(empresaIdQuery, 10)
        : undefined;
    const monedaId = monedaIdQuery ? parseInt(monedaIdQuery, 10) : undefined;

    const vendedorIds = vendedorIdsQuery
      ? vendedorIdsQuery.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
      : undefined;
    const usuarioIds = usuarioIdsQuery
      ? usuarioIdsQuery.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
      : undefined;

    return this.facturasService.getReporteDiario({
      fecha: fecha || new Date().toISOString().split('T')[0],
      fechaDesde,
      fechaHasta,
      sucursalId: scopedSucursalId,
      empresaId: scopedEmpresaId,
      monedaId,
      vendedorIds,
      usuarioIds,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.facturasService.findOne(id);
  }

  @Patch(':id/anular')
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularFacturaDto,
  ) {
    return this.facturasService.anular(id, dto.motivo);
  }
}
