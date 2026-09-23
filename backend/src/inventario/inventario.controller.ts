import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventarioService } from './inventario.service';
import {
  CreateReglaTransformacionDto,
  EjecutarTransformacionDto,
} from './dto/create-transformacion.dto';
import { CreatePreliminarInventarioDto } from './dto/create-preliminar-inventario.dto';
import { UpdatePreliminarInventarioDto } from './dto/update-preliminar-inventario.dto';
import { CreateTransformacionDobleDto } from './dto/create-transformacion-doble.dto';
import { QueryInventarioDto } from './dto/query-inventario.dto';
import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('Inventario')
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  // ── Reglas de transformación ───────────────────────────────────────────────

  @Get('reglas')
  @RequirePermission('inventario.verReglas')
  @ApiOperation({ summary: 'Lista reglas de transformación de productos' })
  findReglas(@Query('producto_id') productoId?: string) {
    return this.inventarioService.findReglas(
      productoId ? parseInt(productoId, 10) : undefined,
    );
  }

  @Post('reglas')
  @RequirePermission('inventario.admin')
  @ApiOperation({ summary: 'Crea una regla de transformación (solo admin)' })
  crearRegla(@Body() dto: CreateReglaTransformacionDto) {
    return this.inventarioService.crearRegla(dto);
  }

  // ── Transformaciones ───────────────────────────────────────────────────────

  @Post('transformaciones/calcular')
  @RequirePermission('inventario.transformar')
  @ApiOperation({
    summary:
      'Calcula el resultado de una transformación SIN ejecutarla (preview)',
  })
  calcularTransformacion(@Body() dto: EjecutarTransformacionDto) {
    return this.inventarioService.calcularTransformacion(dto);
  }

  @Post('transformaciones')
  @RequirePermission('inventario.transformar')
  @ApiOperation({ summary: 'Ejecuta una transformación de inventario' })
  ejecutarTransformacion(
    @Body() dto: EjecutarTransformacionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventarioService.ejecutarTransformacion(dto, user);
  }

  @Get('transformaciones')
  @RequirePermission('inventario.transformar')
  @ApiOperation({ summary: 'Historial de transformaciones (filtrado por rol)' })
  findTransformaciones(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryInventarioDto,
  ) {
    return this.inventarioService.findTransformaciones(user, query);
  }

  @Post('transformaciones/doble')
  @RequirePermission('inventario.transformar')
  @ApiOperation({
    summary:
      'Ejecuta transformación de doble módulo (genera Descargo D y Cargo C vinculados por documento_origen TRF)',
  })
  ejecutarTransformacionDoble(
    @Body() dto: CreateTransformacionDobleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventarioService.ejecutarTransformacionDoble(dto, user);
  }

  @Get('transformaciones/:id')
  @RequirePermission('inventario.transformar')
  @ApiOperation({ summary: 'Obtiene el detalle completo de una transformación' })
  findOneTransformacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventarioService.findOneTransformacion(id, user);
  }

  // ── Preliminares de inventario ─────────────────────────────────────────────

  @Post('preliminares')
  @RequirePermission('inventario.preliminar')
  @ApiOperation({ summary: 'Guarda un preliminar de inventario (cargo o descargo)' })
  crearPreliminar(
    @Body() dto: CreatePreliminarInventarioDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventarioService.crearPreliminarInventario(dto, user);
  }

  @Get('preliminares')
  @RequirePermission('inventario.preliminar')
  @ApiOperation({
    summary:
      'Lista preliminares INV_CARGO / INV_DESCARGO. Nacional ve todos; sucursal solo los propios.',
  })
  findPreliminaresInventario(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryInventarioDto,
  ) {
    return this.inventarioService.findPreliminaresInventario(user, query);
  }

  @Get('preliminares/:id')
  @RequirePermission('inventario.preliminar')
  @ApiOperation({ summary: 'Obtiene el detalle completo de un preliminar de inventario' })
  findOnePreliminar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventarioService.findOnePreliminarInventario(id, user);
  }

  @Patch('preliminares/:id')
  @RequirePermission('inventario.preliminar')
  @ApiOperation({ summary: 'Actualiza un preliminar de inventario existente sin afectar stock' })
  actualizarPreliminar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePreliminarInventarioDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventarioService.actualizarPreliminarInventario(id, dto, user);
  }

  @Delete('preliminares/:id')
  @RequirePermission('inventario.preliminar')
  @ApiOperation({ summary: 'Elimina un preliminar de inventario descartado' })
  eliminarPreliminar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventarioService.eliminarPreliminarInventario(id, user);
  }

  @Post('preliminares/:id/aplicar')
  @RequirePermission('inventario.nacional')
  @ApiOperation({
    summary:
      'Aplica el preliminar al stock real y lo elimina. Solo inventario nacional.',
  })
  aplicarPreliminar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventarioService.aplicarPreliminar(id, user);
  }
}
