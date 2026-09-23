import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Categoria } from './entities/categoria.entity';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('categorias')
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post()
  @RequirePermission('inventory.categories')
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  @ApiResponse({
    status: 201,
    description: 'La categoría ha sido creada exitosamente.',
    type: Categoria,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - El código de categoría ya existe.',
  })
  create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriasService.create(createCategoriaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las categorías' })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorías.',
    type: [Categoria],
  })
  findAll() {
    return this.categoriasService.findAll();
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Obtener una categoría por su código' })
  @ApiResponse({
    status: 200,
    description: 'La categoría encontrada.',
    type: Categoria,
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada.' })
  findOne(@Param('codigo') codigo: string) {
    return this.categoriasService.findOne(codigo);
  }

  @Patch(':codigo')
  @RequirePermission('inventory.categories')
  @ApiOperation({ summary: 'Actualizar una categoría por su código' })
  @ApiResponse({
    status: 200,
    description: 'La categoría ha sido actualizada exitosamente.',
    type: Categoria,
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada.' })
  update(
    @Param('codigo') codigo: string,
    @Body() updateCategoriaDto: UpdateCategoriaDto,
  ) {
    return this.categoriasService.update(codigo, updateCategoriaDto);
  }

  @Delete(':codigo')
  @RequirePermission('inventory.categories')
  @ApiOperation({ summary: 'Eliminar una categoría por su código' })
  @ApiResponse({
    status: 200,
    description: 'La categoría ha sido eliminada exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada.' })
  remove(@Param('codigo') codigo: string) {
    return this.categoriasService.remove(codigo);
  }
}
