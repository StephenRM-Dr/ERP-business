import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateCuentaBancariaDto } from './dto/create-cuenta-bancaria.dto';
import { UpdateCuentaBancariaDto } from './dto/update-cuenta-bancaria.dto';
import { CuentaBancaria } from './entities/cuenta-bancaria.entity';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class CuentasBancariasService {
  constructor(
    @InjectRepository(CuentaBancaria)
    private readonly cuentaRepository: Repository<CuentaBancaria>,
  ) {}

  private async save(cuenta: CuentaBancaria): Promise<CuentaBancaria> {
    try {
      return await this.cuentaRepository.save(cuenta);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          `Ya existe una cuenta bancaria con ese número`,
        );
      }
      throw error;
    }
  }

  async create(
    createCuentaBancariaDto: CreateCuentaBancariaDto,
  ): Promise<CuentaBancaria> {
    const cuenta = this.cuentaRepository.create(createCuentaBancariaDto);
    return await this.save(cuenta);
  }

  async findAll(): Promise<CuentaBancaria[]> {
    return await this.cuentaRepository.find({
      order: { id: 'DESC' },
      relations: { banco: true, moneda: true },
    });
  }

  async findOne(numero_cuenta: string): Promise<CuentaBancaria> {
    const cuenta = await this.cuentaRepository.findOne({
      where: { numero_cuenta },
      relations: { banco: true, moneda: true },
    });
    if (!cuenta) {
      throw new NotFoundException(
        `Cuenta bancaria ${numero_cuenta} no encontrada`,
      );
    }
    return cuenta;
  }

  async update(
    numero_cuenta: string,
    updateCuentaBancariaDto: UpdateCuentaBancariaDto,
  ): Promise<CuentaBancaria> {
    const cuenta = await this.findOne(numero_cuenta);
    this.cuentaRepository.merge(cuenta, updateCuentaBancariaDto);
    return await this.save(cuenta);
  }

  async remove(numero_cuenta: string): Promise<void> {
    const cuenta = await this.findOne(numero_cuenta);
    await this.cuentaRepository.remove(cuenta);
  }
}
