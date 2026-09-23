import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { resolveSucursalScope } from '../auth/can-view-all-locations';

@ApiTags('stock')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @RequirePermission('inventory.control')
  create(@Body() createStockDto: CreateStockDto) {
    return this.stockService.create(createStockDto);
  }

  @Get()
  @RequirePermission(['inventory.control', 'inventory.summary', 'invoices', 'returns', 'compras'])
  @ApiQuery({ name: 'productoId', required: false, type: Number })
  @ApiQuery({ name: 'almacenId', required: false, type: Number })
  @ApiQuery({ name: 'sucursal_id', required: false, type: Number })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('productoId') productoId?: string,
    @Query('almacenId') almacenId?: string,
    @Query('sucursal_id') sucursalId?: string,
  ) {
    // Sin 'general.viewAllLocations' solo ve el stock de los depósitos de su
    // propia sucursal, mande lo que mande por query.
    return this.stockService.findAll(
      productoId ? parseInt(productoId, 10) : undefined,
      almacenId ? parseInt(almacenId, 10) : undefined,
      resolveSucursalScope(user, sucursalId),
    );
  }

  @Patch(':id')
  @RequirePermission('inventory.control')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStockDto: UpdateStockDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.stockService.update(id, updateStockDto, user.id, user.sucursalId ?? undefined);
  }

  @Get('kardex')
  @RequirePermission('inventory.control')
  findKardex(
    @CurrentUser() user: CurrentUserPayload,
    @Query('productoId') productoId?: string,
    @Query('almacenId') almacenId?: string,
    @Query('sucursal_id') sucursalId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('tipoClasificado') tipoClasificado?: string,
  ) {
    return this.stockService.findKardex({
      productoId: productoId ? parseInt(productoId, 10) : undefined,
      depositoId: almacenId ? parseInt(almacenId, 10) : undefined,
      sucursalId: resolveSucursalScope(user, sucursalId),
      fechaDesde,
      fechaHasta,
      tipoClasificado,
    });
  }

  @Get(':id/movimientos')
  @RequirePermission('inventory.control')
  findMovimientos(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.findMovimientos(id);
  }

  @Delete(':id')
  @RequirePermission('inventory.control')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.stockService.remove(id, user.id, user.sucursalId ?? 0);
  }
}
