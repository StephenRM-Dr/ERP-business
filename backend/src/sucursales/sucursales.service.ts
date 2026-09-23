import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { Sucursal } from './entities/sucursal.entity';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const RESTRICT_VIOLATION = '23001'; // ON DELETE RESTRICT — código separado de 23503

@Injectable()
export class SucursalesService {
  constructor(
    @InjectRepository(Sucursal)
    private readonly sucursalRepository: Repository<Sucursal>,
  ) {}

  private async save(sucursal: Sucursal): Promise<Sucursal> {
    try {
      return await this.sucursalRepository.save(sucursal);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(`Ya existe una sucursal con ese código`);
      }
      throw error;
    }
  }

  async create(createSucursalDto: CreateSucursalDto): Promise<Sucursal> {
    const sucursal = this.sucursalRepository.create(createSucursalDto);
    return await this.save(sucursal);
  }

  async findAll(): Promise<Sucursal[]> {
    return await this.sucursalRepository.find({
      order: { id: 'DESC' },
      relations: { empresa: true },
    });
  }

  async findOne(codigo: string): Promise<Sucursal> {
    const sucursal = await this.sucursalRepository.findOne({
      where: { codigo },
      relations: { empresa: true },
    });
    if (!sucursal) {
      throw new NotFoundException(
        `Sucursal con código ${codigo} no encontrada`,
      );
    }
    return sucursal;
  }

  async update(
    codigo: string,
    updateSucursalDto: UpdateSucursalDto,
  ): Promise<Sucursal> {
    const sucursal = await this.findOne(codigo);
    this.sucursalRepository.merge(sucursal, updateSucursalDto);
    return await this.save(sucursal);
  }

  async remove(codigo: string): Promise<void> {
    const sucursal = await this.findOne(codigo);
    try {
      await this.sucursalRepository.remove(sucursal);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        ((error.driverError as { code?: string })?.code === FOREIGN_KEY_VIOLATION ||
          (error.driverError as { code?: string })?.code === RESTRICT_VIOLATION)
      ) {
        throw new ConflictException(
          'No se puede eliminar la sucursal: tiene almacenes, inventario u otros registros asociados',
        );
      }
      throw error;
    }
  }
}
