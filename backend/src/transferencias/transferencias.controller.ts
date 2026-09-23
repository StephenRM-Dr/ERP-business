import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TransferenciasService } from './transferencias.service';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { RecibirTransferenciaDto } from './dto/recibir-transferencia.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('transferencias')
@RequirePermission('inventory.transfers')
@Controller('transferencias')
export class TransferenciasController {
  constructor(private readonly transferenciasService: TransferenciasService) {}

  @Post()
  create(
    @Body() createTransferenciaDto: CreateTransferenciaDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.transferenciasService.create(
      createTransferenciaDto,
      user.id,
      user.sucursalId ?? undefined,
    );
  }

  @Get()
  findAll() {
    return this.transferenciasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transferenciasService.findOne(id);
  }

  @Patch(':id/despachar')
  despachar(@Param('id', ParseIntPipe) id: number) {
    return this.transferenciasService.despachar(id);
  }

  @Patch(':id/recibir')
  recibir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: RecibirTransferenciaDto,
  ) {
    return this.transferenciasService.recibir(id, dto);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.transferenciasService.cancelar(id);
  }
}
