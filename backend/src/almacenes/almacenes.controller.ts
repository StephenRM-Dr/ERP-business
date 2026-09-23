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
} from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { AlmacenesService } from './almacenes.service';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { resolveSucursalScope } from '../auth/can-view-all-locations';

@ApiTags('almacenes')
@Controller('almacenes')
export class AlmacenesController {
  constructor(private readonly almacenesService: AlmacenesService) {}

  @Post()
  @RequirePermission('inventory.control')
  create(@Body() createAlmacenDto: CreateAlmacenDto) {
    return this.almacenesService.create(createAlmacenDto);
  }

  @Get()
  @ApiQuery({ name: 'sucursal_id', required: false, type: Number })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('sucursal_id') sucursalId?: string,
  ) {
    // Sin 'general.viewAllLocations' el listado queda fijado a la sucursal del
    // usuario: el sucursal_id que mande se ignora.
    return this.almacenesService.findAll(resolveSucursalScope(user, sucursalId));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.almacenesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('inventory.control')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAlmacenDto: UpdateAlmacenDto,
  ) {
    return this.almacenesService.update(id, updateAlmacenDto);
  }

  @Delete(':id')
  @RequirePermission('inventory.control')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.almacenesService.remove(id);
  }
}
