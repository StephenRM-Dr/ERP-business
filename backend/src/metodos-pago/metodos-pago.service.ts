import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { MetodoPago } from './entities/metodo-pago.entity';
import { CreateMetodoPagoDto } from './dto/create-metodo-pago.dto';
import { UpdateMetodoPagoDto } from './dto/update-metodo-pago.dto';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class MetodosPagoService {
  constructor(
    @InjectRepository(MetodoPago)
    private readonly metodosPagoRepository: Repository<MetodoPago>,
  ) {}

  async create(createMetodoPagoDto: CreateMetodoPagoDto) {
    const nuevoMetodo = this.metodosPagoRepository.create(createMetodoPagoDto);
    try {
      return await this.metodosPagoRepository.save(nuevoMetodo);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as any)?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(`Ya existe un método de pago con el código ${createMetodoPagoDto.codigo}`);
      }
      throw error;
    }
  }

  async findAll() {
    return await this.metodosPagoRepository.find({
      order: { id: 'ASC' },
      relations: { moneda: true },
    });
  }

  async findOne(id: number) {
    const metodo = await this.metodosPagoRepository.findOne({ 
      where: { id },
      relations: { moneda: true },
    });
    if (!metodo) {
      throw new NotFoundException(`Método de pago con ID ${id} no encontrado`);
    }
    return metodo;
  }

  async update(id: number, updateMetodoPagoDto: UpdateMetodoPagoDto) {
    const metodo = await this.findOne(id);
    this.metodosPagoRepository.merge(metodo, updateMetodoPagoDto);
    try {
      return await this.metodosPagoRepository.save(metodo);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as any)?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(`Ya existe un método de pago con ese código`);
      }
      throw error;
    }
  }

  async remove(id: number) {
    const metodo = await this.findOne(id);
    // Para evitar romper integridad referencial, es mejor soft delete o setear activo=false
    metodo.activo = false;
    return await this.metodosPagoRepository.save(metodo);
  }
}
