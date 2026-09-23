import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateTasaCambioDto } from './dto/create-tasa-cambio.dto';
import { UpdateTasaCambioDto } from './dto/update-tasa-cambio.dto';
import { TasaCambio } from './entities/tasa-cambio.entity';

const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503';

@Injectable()
export class TasasCambioService {
  constructor(
    @InjectRepository(TasaCambio)
    private readonly tasaCambioRepository: Repository<TasaCambio>,
  ) {}

  private async save(tasaCambio: TasaCambio): Promise<TasaCambio> {
    try {
      return await this.tasaCambioRepository.save(tasaCambio);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const code = (error.driverError as { code?: string })?.code;
        if (code === UNIQUE_VIOLATION) {
          throw new ConflictException(
            'Ya existe una tasa de cambio para esta moneda en esta fecha',
          );
        }
        if (code === FK_VIOLATION) {
          throw new ConflictException(
            'Error de base de datos: Clave foránea no válida (es probable que el usuario_id o moneda_id no existan).',
          );
        }
      }
      throw error;
    }
  }

  async create(createTasaCambioDto: CreateTasaCambioDto): Promise<TasaCambio> {
    const tasaCambio = this.tasaCambioRepository.create(createTasaCambioDto);
    return await this.save(tasaCambio);
  }

  async findAll(): Promise<TasaCambio[]> {
    return await this.tasaCambioRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<TasaCambio> {
    const tasaCambio = await this.tasaCambioRepository.findOne({
      where: { id },
    });
    if (!tasaCambio) {
      throw new NotFoundException(`Tasa de cambio con ID ${id} no encontrada`);
    }
    return tasaCambio;
  }

  async updateByMoneda(
    moneda_id: number,
    updateTasaCambioDto: UpdateTasaCambioDto,
  ): Promise<TasaCambio> {
    const tasaCambio = await this.tasaCambioRepository.findOne({
      where: { moneda_id },
      order: { fecha_tasa: 'DESC', id: 'DESC' },
    });

    if (!tasaCambio) {
      throw new NotFoundException(
        `No se encontró ninguna tasa de cambio para la moneda con ID ${moneda_id}`,
      );
    }

    this.tasaCambioRepository.merge(tasaCambio, updateTasaCambioDto);
    return await this.save(tasaCambio);
  }

  async remove(id: number): Promise<void> {
    const tasaCambio = await this.findOne(id);
    await this.tasaCambioRepository.remove(tasaCambio);
  }
}
