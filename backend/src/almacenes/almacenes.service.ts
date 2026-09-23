import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';
import { Almacen } from './entities/almacen.entity';

const FOREIGN_KEY_VIOLATION = '23503';
const RESTRICT_VIOLATION = '23001'; // ON DELETE RESTRICT — código separado de 23503

@Injectable()
export class AlmacenesService {
  constructor(
    @InjectRepository(Almacen)
    private readonly almacenRepository: Repository<Almacen>,
  ) {}

  async create(createAlmacenDto: CreateAlmacenDto) {
    try {
      const almacen = this.almacenRepository.create(createAlmacenDto);
      return await this.almacenRepository.save(almacen);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException(
          `El almacén con código ${createAlmacenDto.codigo} ya existe`,
        );
      }
      throw error;
    }
  }

  findAll(sucursalId?: number) {
    const where = sucursalId ? { sucursal_id: sucursalId } : {};
    return this.almacenRepository.find({ where, order: { id: 'DESC' } });
  }

  async findOne(id: number) {
    const almacen = await this.almacenRepository.findOne({ where: { id } });
    if (!almacen)
      throw new NotFoundException(`Almacén con ID ${id} no encontrado`);
    return almacen;
  }

  async update(id: number, updateAlmacenDto: UpdateAlmacenDto) {
    const almacen = await this.findOne(id);
    this.almacenRepository.merge(almacen, updateAlmacenDto);
    try {
      return await this.almacenRepository.save(almacen);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException(
          `El código ${updateAlmacenDto.codigo} ya existe`,
        );
      }
      throw error;
    }
  }

  async remove(id: number) {
    const almacen = await this.findOne(id);
    try {
      return await this.almacenRepository.remove(almacen);
    } catch (error: any) {
      // Captura la violación de FK (código 23503) sin importar cómo TypeORM
      // empaquete el error de PostgreSQL (QueryFailedError directo, o anidado
      // en driverError cuando hay transacción implícita).
      const pgCode: string | undefined =
        error?.code ?? error?.driverError?.code;
      if (pgCode === FOREIGN_KEY_VIOLATION || pgCode === RESTRICT_VIOLATION) {
        throw new ConflictException(
          `No se puede eliminar el almacén "${almacen.codigo}" porque tiene stock u otros registros asociados. ` +
            `Elimine o reasigne el stock primero.`,
        );
      }
      throw error;
    }
  }
}
