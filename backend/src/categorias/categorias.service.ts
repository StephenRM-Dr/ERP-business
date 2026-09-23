import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Categoria } from './entities/categoria.entity';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const RESTRICT_VIOLATION = '23001'; // ON DELETE RESTRICT — código separado de 23503

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) {}

  private async save(categoria: Categoria): Promise<Categoria> {
    try {
      return await this.categoriaRepository.save(categoria);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          `Ya existe una categoría con el código ${categoria.codigo}`,
        );
      }
      throw error;
    }
  }

  async create(createCategoriaDto: CreateCategoriaDto): Promise<Categoria> {
    const categoria = this.categoriaRepository.create(createCategoriaDto);
    return await this.save(categoria);
  }

  async findAll(): Promise<Categoria[]> {
    return await this.categoriaRepository.find({ order: { id: 'DESC' } });
  }

  async findOne(codigo: string): Promise<Categoria> {
    const categoria = await this.categoriaRepository.findOne({
      where: { codigo },
    });
    if (!categoria) {
      throw new NotFoundException(
        `Categoría con código ${codigo} no encontrada`,
      );
    }
    return categoria;
  }

  async update(
    codigo: string,
    updateCategoriaDto: UpdateCategoriaDto,
  ): Promise<Categoria> {
    const categoria = await this.findOne(codigo);
    this.categoriaRepository.merge(categoria, updateCategoriaDto);
    return await this.save(categoria);
  }

  async remove(codigo: string): Promise<void> {
    const categoria = await this.findOne(codigo);
    try {
      await this.categoriaRepository.remove(categoria);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        ((error.driverError as { code?: string })?.code === FOREIGN_KEY_VIOLATION ||
          (error.driverError as { code?: string })?.code === RESTRICT_VIOLATION)
      ) {
        throw new ConflictException(
          `No se puede eliminar la categoría ${codigo} porque tiene productos asociados`,
        );
      }
      throw error;
    }
  }
}
