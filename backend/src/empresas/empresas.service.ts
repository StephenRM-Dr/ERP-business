import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { Empresa } from './entities/empresa.entity';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const RESTRICT_VIOLATION = '23001'; // ON DELETE RESTRICT — código separado de 23503

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
  ) {}

  private async save(empresa: Empresa): Promise<Empresa> {
    try {
      return await this.empresaRepository.save(empresa);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(`Ya existe una empresa con ese RIF`);
      }
      throw error;
    }
  }

  async create(createEmpresaDto: CreateEmpresaDto): Promise<Empresa> {
    const empresa = this.empresaRepository.create(createEmpresaDto);
    return await this.save(empresa);
  }

  async findAll(): Promise<Empresa[]> {
    return await this.empresaRepository.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<Empresa> {
    const empresa = await this.empresaRepository.findOne({ where: { id } });
    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }
    return empresa;
  }

  async update(
    id: number,
    updateEmpresaDto: UpdateEmpresaDto,
  ): Promise<Empresa> {
    const empresa = await this.findOne(id);
    this.empresaRepository.merge(empresa, updateEmpresaDto);
    return await this.save(empresa);
  }

  async remove(id: number): Promise<void> {
    const empresa = await this.findOne(id);
    try {
      await this.empresaRepository.remove(empresa);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        ((error.driverError as { code?: string })?.code === FOREIGN_KEY_VIOLATION ||
          (error.driverError as { code?: string })?.code === RESTRICT_VIOLATION)
      ) {
        throw new ConflictException(
          'No se puede eliminar la empresa: tiene sucursales u otros registros asociados',
        );
      }
      throw error;
    }
  }
}
