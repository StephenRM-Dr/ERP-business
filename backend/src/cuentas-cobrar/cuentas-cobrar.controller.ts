import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CuentasCobrarService } from './cuentas-cobrar.service';
import { CreateCuentaCobrarDto } from './dto/create-cuenta-cobrar.dto';
import { UpdateCuentaCobrarDto } from './dto/update-cuenta-cobrar.dto';
import { CreateDocumentoCxCDto } from './dto/create-documento-cxc.dto';
import { AplicarDocumentosCxCDto } from './dto/aplicar-documentos-cxc.dto';
import { PagoDirectoCxCDto } from './dto/pago-directo-cxc.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('cuentas-cobrar')
@RequirePermission(['recibos.cobro', 'cuentas.cobrar'])
@Controller('cuentas-cobrar')
export class CuentasCobrarController {
  constructor(private readonly cuentasCobrarService: CuentasCobrarService) {}

  @Get('cliente/:clienteId/resumen')
  @ApiOperation({ summary: 'Obtener resumen consolidado, totales y movimientos de un cliente' })
  getResumenCliente(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return this.cuentasCobrarService.getResumenCliente(clienteId);
  }

  @Post('documento')
  @ApiOperation({ summary: 'Generar documento directo (Nota de Crédito, Nota de Débito, Adelanto, Giro, Ajuste)' })
  createDocumento(@Body() dto: CreateDocumentoCxCDto) {
    return this.cuentasCobrarService.createDocumento(dto);
  }

  @Post('aplicar-documentos')
  @ApiOperation({ summary: 'Cruzar saldo de anticipo o nota de crédito contra facturas pendientes' })
  aplicarDocumentos(@Body() dto: AplicarDocumentosCxCDto, @Request() req: any) {
    const usuarioId = req.user?.userId || req.user?.id || dto.usuario_id || 1;
    const sucursalId = req.user?.sucursalId || req.user?.sucursal_id || dto.sucursal_id || 1;
    return this.cuentasCobrarService.aplicarDocumentos(dto, usuarioId, sucursalId);
  }

  @Post('pago-directo')
  @ApiOperation({ summary: 'Registrar pago / cobro directo desde Cuentas por Cobrar' })
  pagoDirecto(@Body() dto: PagoDirectoCxCDto, @Request() req: any) {
    const usuarioId = req.user?.userId || req.user?.id || 1;
    return this.cuentasCobrarService.pagoDirecto(dto, usuarioId);
  }

  @Post('cliente/:clienteId/cruzar-devoluciones-auto')
  @ApiOperation({ summary: 'Cruzar automáticamente devoluciones y notas de crédito pendientes contra facturas pendientes' })
  cruzarDevolucionesAutomatico(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return this.cuentasCobrarService.cruzarDevolucionesAutomatico(clienteId);
  }

  @Post('cliente/:clienteId/anular-ultima')
  @ApiOperation({ summary: 'Anular la última operación o recibo del cliente' })
  anularUltimaOperacion(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return this.cuentasCobrarService.anularUltimaOperacion(clienteId);
  }

  @Delete('documento/:tipo/:id')
  @ApiOperation({ summary: 'Anular un documento o recibo específico de Cuentas por Cobrar' })
  anularDocumentoEspecifico(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cuentasCobrarService.anularDocumentoEspecifico(tipo, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cuenta por cobrar' })
  create(@Body() dto: CreateCuentaCobrarDto) {
    return this.cuentasCobrarService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cuentas por cobrar' })
  @ApiQuery({ name: 'cliente_id', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  findAll(
    @Query('cliente_id') clienteId?: string,
    @Query('status') status?: string,
  ) {
    return this.cuentasCobrarService.findAll(
      clienteId ? parseInt(clienteId, 10) : undefined,
      status,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cuenta por cobrar por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cuentasCobrarService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar status o saldo de la cuenta' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCuentaCobrarDto,
  ) {
    return this.cuentasCobrarService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cuenta por cobrar' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cuentasCobrarService.remove(id);
  }
}
