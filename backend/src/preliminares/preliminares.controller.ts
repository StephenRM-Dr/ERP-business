import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { PreliminaresService } from './preliminares.service';
import { CreatePreliminarDto } from './dto/create-preliminar.dto';
import { UpdatePreliminarDto } from './dto/update-preliminar.dto';
import type { TipoPreliminar } from './entities/documento-preliminar.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

/** Permiso que exige cada tipo de preliminar: el mismo del documento real. */
const PERMISO_POR_TIPO: Record<TipoPreliminar, string> = {
  FACTURA: 'invoices',
  TRANSFERENCIA: 'inventory.transfers',
  INV_CARGO: 'inventario.preliminar',
  INV_DESCARGO: 'inventario.preliminar',
};

@ApiTags('preliminares')
@Controller('preliminares')
export class PreliminaresController {
  constructor(private readonly preliminaresService: PreliminaresService) {}

  /**
   * El permiso depende del tipo del documento, no del endpoint, así que no se
   * puede resolver con @RequirePermission (que es metadata estática): un
   * cajero con 'invoices' pero sin 'inventory.transfers' usa preliminares de
   * factura y no los de transferencia.
   */
  private assertPuede(user: CurrentUserPayload, tipo: TipoPreliminar): void {
    if (user.rolId === 1) return;
    const permiso = PERMISO_POR_TIPO[tipo];
    if (!user.permisos.includes(permiso)) {
      throw new ForbiddenException(
        `No tiene permiso para esta operación (requiere: ${permiso}).`,
      );
    }
  }

  private assertTipoValido(tipo: string): asserts tipo is TipoPreliminar {
    if (!['FACTURA', 'TRANSFERENCIA', 'INV_CARGO', 'INV_DESCARGO'].includes(tipo)) {
      throw new BadRequestException(
        `tipo debe ser FACTURA, TRANSFERENCIA, INV_CARGO o INV_DESCARGO (recibido: ${tipo})`,
      );
    }
  }

  @Get()
  @ApiQuery({ name: 'tipo', required: true, enum: ['FACTURA', 'TRANSFERENCIA', 'INV_CARGO', 'INV_DESCARGO'] })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('tipo') tipo: string,
  ) {
    this.assertTipoValido(tipo);
    this.assertPuede(user, tipo);
    return this.preliminaresService.findAll(tipo);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const preliminar = await this.preliminaresService.findOne(id);
    this.assertPuede(user, preliminar.tipo);
    return preliminar;
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePreliminarDto,
  ) {
    this.assertPuede(user, dto.tipo);
    // Misma convención que facturas.service: sin sucursal asignada se asume la 1.
    return this.preliminaresService.create(dto, user.id, user.sucursalId ?? 1);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePreliminarDto,
  ) {
    const preliminar = await this.preliminaresService.findOne(id);
    this.assertPuede(user, preliminar.tipo);
    return this.preliminaresService.update(id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const preliminar = await this.preliminaresService.findOne(id);
    this.assertPuede(user, preliminar.tipo);
    return this.preliminaresService.remove(id);
  }
}
