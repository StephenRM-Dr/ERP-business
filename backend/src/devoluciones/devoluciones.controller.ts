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
import { DevolucionesService } from './devoluciones.service';
import { CreateDevolucionDto } from './dto/create-devolucion.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';


@ApiTags('devoluciones')
@RequirePermission('returns')
@Controller('devoluciones')
export class DevolucionesController {
  constructor(private readonly devolucionesService: DevolucionesService) {}

  @Post()
  create(
    @Body() createDevolucionDto: CreateDevolucionDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.devolucionesService.create(
      createDevolucionDto,
      currentUser,
      currentUser.sucursalId ?? 1,
    );
  }

  @Get()
  findAll() {
    return this.devolucionesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.devolucionesService.findOne(id);
  }

  @Patch(':id/procesar')
  procesar(@Param('id', ParseIntPipe) id: number) {
    return this.devolucionesService.procesar(id);
  }

  @Patch(':id/anular')
  anular(@Param('id', ParseIntPipe) id: number) {
    return this.devolucionesService.anular(id);
  }
}
