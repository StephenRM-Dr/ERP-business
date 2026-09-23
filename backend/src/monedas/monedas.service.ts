import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateMonedaDto } from './dto/create-moneda.dto';
import { UpdateMonedaDto } from './dto/update-moneda.dto';
import { Moneda } from './entities/moneda.entity';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
// Postgres reports a DELETE blocked by an explicit "ON DELETE RESTRICT"
// constraint (like tasas_cambio.fk_tasa_moneda) under this separate code,
// not 23503 — see the "Class 23" appendix in the Postgres error codes list.
const RESTRICT_VIOLATION = '23001';

@Injectable()
export class MonedasService {
  constructor(
    @InjectRepository(Moneda)
    private readonly monedaRepository: Repository<Moneda>,
  ) {}

  private async save(moneda: Moneda): Promise<Moneda> {
    try {
      return await this.monedaRepository.save(moneda);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          `Ya existe una moneda con el código ISO ${moneda.codigo_iso}`,
        );
      }
      throw error;
    }
  }

  async create(createMonedaDto: CreateMonedaDto): Promise<Moneda> {
    const moneda = this.monedaRepository.create(createMonedaDto);
    return await this.save(moneda);
  }

  async findAll(): Promise<Moneda[]> {
    return await this.monedaRepository.find({ order: { id: 'DESC' } });
  }

  async findOne(codigo_iso: string): Promise<Moneda> {
    const moneda = await this.monedaRepository.findOne({
      where: { codigo_iso },
    });
    if (!moneda) {
      throw new NotFoundException(
        `Moneda con código ISO ${codigo_iso} no encontrada`,
      );
    }
    return moneda;
  }

  async update(
    codigo_iso: string,
    updateMonedaDto: UpdateMonedaDto,
  ): Promise<Moneda> {
    const moneda = await this.findOne(codigo_iso);
    this.monedaRepository.merge(moneda, updateMonedaDto);
    return await this.save(moneda);
  }

  async remove(codigo_iso: string): Promise<void> {
    const moneda = await this.findOne(codigo_iso);
    try {
      await this.monedaRepository.remove(moneda);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const code = (error.driverError as { code?: string })?.code;
        if (code === FOREIGN_KEY_VIOLATION || code === RESTRICT_VIOLATION) {
          throw new ConflictException(
            `No se puede eliminar la moneda ${codigo_iso} porque está en uso en facturas, tasas de cambio u otros registros`,
          );
        }
      }
      throw error;
    }
  }
}
