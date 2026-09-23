import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Res,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as fs from 'fs';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './entities/producto.entity';
import { CreateProductoCostoDto } from './dto/create-producto-costo.dto';
import { CreateProductoPrecioDto } from './dto/create-producto-precio.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('productos')
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @RequirePermission('inventory.products')
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @ApiResponse({
    status: 201,
    description: 'El producto ha sido creado exitosamente.',
    type: Producto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - El código de producto ya existe.',
  })
  create(
    @Body() createProductoDto: CreateProductoDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.productosService.create(createProductoDto, user.id);
  }

  @Get()
  @RequirePermission(['inventory.products', 'inventory.summary', 'invoices', 'returns', 'compras', 'corte'])
  @ApiOperation({ summary: 'Obtener todos los productos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos.',
    type: [Producto],
  })
  findAll() {
    return this.productosService.findAll();
  }

  // --- Batch & Excel Precios (rutas estáticas prioritarias) ---
  @Post('precios/preview-excel')
  @RequirePermission(['inventory.products', 'inventory.prices'])
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Previsualizar y totalizar archivo Excel antes de aplicar los precios' })
  previewPreciosExcel(
    @UploadedFile() file: any,
    @Query('tipo') tipo: 'BS' | 'DIVISA' = 'BS',
  ) {
    return this.productosService.previewPreciosFromExcel(file.buffer, tipo);
  }

  @Post('precios/upload-excel')
  @RequirePermission(['inventory.products', 'inventory.prices'])
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir archivo Excel para actualizar precios masivamente (BS o DIVISA)' })
  uploadPreciosExcel(
    @UploadedFile() file: any,
    @Query('tipo') tipo: 'BS' | 'DIVISA' = 'BS',
  ) {
    return this.productosService.importPreciosFromExcel(file.buffer, tipo);
  }

  @Get('precios/export-excel')
  @RequirePermission(['inventory.products', 'inventory.prices'])
  @ApiOperation({ summary: 'Exportar precios a archivo Excel formateado (BS o DIVISA)' })
  async exportPreciosExcel(
    @Query('tipo') tipo: 'BS' | 'DIVISA' = 'BS',
    @Res() res: any,
  ) {
    const filePath = await this.productosService.exportPreciosToExcel(tipo);
    const filename = `PRECIOS_${tipo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.download(filePath, filename, (err: any) => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore cleanup errors
        }
      }
    });
  }

  @Post('precios/batch')
  @RequirePermission(['inventory.products', 'inventory.prices'])
  @ApiOperation({ summary: 'Actualizar precios en lote' })
  updatePreciosBatch(
    @Body() body: { items: Array<{ codigo: string; nivel_precio_id: number; moneda_id: number; precio: number }> },
  ) {
    return this.productosService.updatePreciosBatch(body.items);
  }

  @Get(':codigo')
  @RequirePermission(['inventory.products', 'inventory.summary', 'invoices', 'returns', 'compras', 'corte'])
  @ApiOperation({ summary: 'Obtener un producto por su código' })
  @ApiResponse({
    status: 200,
    description: 'El producto encontrado.',
    type: Producto,
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado.' })
  findOne(@Param('codigo') codigo: string) {
    return this.productosService.findOne(codigo);
  }

  @Patch(':codigo')
  @RequirePermission('inventory.products')
  @ApiOperation({ summary: 'Actualizar un producto por su código' })
  @ApiResponse({
    status: 200,
    description: 'El producto ha sido actualizado exitosamente.',
    type: Producto,
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado.' })
  update(
    @Param('codigo') codigo: string,
    @Body() updateProductoDto: UpdateProductoDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.productosService.update(codigo, updateProductoDto, user.id);
  }

  @Delete(':codigo')
  @RequirePermission('inventory.products')
  @ApiOperation({ summary: 'Eliminar un producto por su código' })
  @ApiResponse({
    status: 200,
    description: 'El producto ha sido eliminado exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado.' })
  remove(@Param('codigo') codigo: string) {
    return this.productosService.remove(codigo);
  }

  // --- Costos ---
  @Get(':codigo/costos')
  @RequirePermission('inventory.products')
  @ApiOperation({ summary: 'Obtener historial de costos de un producto' })
  getCostos(@Param('codigo') codigo: string) {
    return this.productosService.getCostos(codigo);
  }

  @Post(':codigo/costos')
  @RequirePermission('inventory.products')
  @ApiOperation({ summary: 'Registrar un nuevo costo para el producto' })
  addCosto(
    @Param('codigo') codigo: string,
    @Body() dto: CreateProductoCostoDto,
  ) {
    return this.productosService.addCosto(codigo, dto);
  }

  @Patch(':codigo/costos/:costoId')
  @RequirePermission('inventory.products')
  @ApiOperation({ summary: 'Actualizar un registro de costo por ID' })
  updateCosto(
    @Param('codigo') codigo: string,
    @Param('costoId', ParseIntPipe) costoId: number,
    @Body() dto: CreateProductoCostoDto,
  ) {
    return this.productosService.updateCosto(codigo, costoId, dto);
  }

  @Delete(':codigo/costos/:costoId')
  @RequirePermission('inventory.products')
  @ApiOperation({ summary: 'Eliminar un registro de costo por ID' })
  removeCosto(
    @Param('codigo') codigo: string,
    @Param('costoId', ParseIntPipe) costoId: number,
  ) {
    return this.productosService.removeCosto(codigo, costoId);
  }

  // --- Precios Individuales ---
  @Get(':codigo/precios')
  @RequirePermission(['inventory.products', 'inventory.prices', 'invoices'])
  @ApiOperation({ summary: 'Obtener historial de precios de un producto' })
  getPrecios(@Param('codigo') codigo: string) {
    return this.productosService.getPrecios(codigo);
  }

  @Post(':codigo/precios')
  @RequirePermission(['inventory.products', 'inventory.prices'])
  @ApiOperation({ summary: 'Registrar un nuevo precio para el producto' })
  addPrecio(
    @Param('codigo') codigo: string,
    @Body() dto: CreateProductoPrecioDto,
  ) {
    return this.productosService.addPrecio(codigo, dto);
  }

  @Patch(':codigo/precios/:precioId')
  @RequirePermission(['inventory.products', 'inventory.prices'])
  @ApiOperation({ summary: 'Actualizar un registro de precio por ID' })
  updatePrecio(
    @Param('codigo') codigo: string,
    @Param('precioId', ParseIntPipe) precioId: number,
    @Body() dto: CreateProductoPrecioDto,
  ) {
    return this.productosService.updatePrecio(codigo, precioId, dto);
  }

  @Delete(':codigo/precios/:precioId')
  @RequirePermission(['inventory.products', 'inventory.prices'])
  @ApiOperation({ summary: 'Eliminar un registro de precio por ID' })
  removePrecio(
    @Param('codigo') codigo: string,
    @Param('precioId', ParseIntPipe) precioId: number,
  ) {
    return this.productosService.removePrecio(codigo, precioId);
  }
}
