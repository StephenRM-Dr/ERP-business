import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { TiposDocumentosService } from './tipos-documentos.service';
import { CreateTipoDocumentoDto } from './dto/create-tipo-documento.dto';
import { UpdateTipoDocumentoDto } from './dto/update-tipo-documento.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('tipos-documentos')
@Controller('tipos-documentos')
export class TiposDocumentosController {
  constructor(private readonly tiposDocumentosService: TiposDocumentosService) {}

  @Post()
  @RequirePermission('master.tiposDocumentos')
  create(@Body() createTipoDocumentoDto: CreateTipoDocumentoDto) {
    return this.tiposDocumentosService.create(createTipoDocumentoDto);
  }

  @Get()
  @ApiQuery({ name: 'sucursal_id', required: false, type: Number, description: 'Filtrar por sucursal' })
  @ApiQuery({ name: 'codigo', required: false, type: String, description: 'Filtrar por código de documento (FAC, RC, TR…)' })
  findAll(
    @Query('sucursal_id') sucursalId?: string,
    @Query('codigo') codigo?: string,
  ) {
    return this.tiposDocumentosService.findAll({
      sucursalId: sucursalId ? parseInt(sucursalId, 10) : undefined,
      codigo,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tiposDocumentosService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('master.tiposDocumentos')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTipoDocumentoDto: UpdateTipoDocumentoDto) {
    return this.tiposDocumentosService.update(id, updateTipoDocumentoDto);
  }

  @Delete(':id')
  @RequirePermission('master.tiposDocumentos')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tiposDocumentosService.remove(id);
  }
}
