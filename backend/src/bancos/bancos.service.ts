import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateBancoDto } from './dto/create-banco.dto';
import { UpdateBancoDto } from './dto/update-banco.dto';
import { Banco } from './entities/banco.entity';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const RESTRICT_VIOLATION = '23001'; // ON DELETE RESTRICT — código separado de 23503

@Injectable()
export class BancosService {
  constructor(
    @InjectRepository(Banco)
    private readonly bancoRepository: Repository<Banco>,
  ) {}

  private async save(banco: Banco): Promise<Banco> {
    try {
      return await this.bancoRepository.save(banco);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(`Ya existe un banco con ese código`);
      }
      throw error;
    }
  }

  async create(createBancoDto: CreateBancoDto): Promise<Banco> {
    const banco = this.bancoRepository.create(createBancoDto);
    return await this.save(banco);
  }

  async findAll(): Promise<Banco[]> {
    return await this.bancoRepository.find({ order: { id: 'DESC' } });
  }

  async findOne(codigo: string): Promise<Banco> {
    const banco = await this.bancoRepository.findOne({ where: { codigo } });
    if (!banco) {
      throw new NotFoundException(`Banco con código ${codigo} no encontrado`);
    }
    return banco;
  }

  async update(codigo: string, updateBancoDto: UpdateBancoDto): Promise<Banco> {
    const banco = await this.findOne(codigo);
    this.bancoRepository.merge(banco, updateBancoDto);
    return await this.save(banco);
  }

  async remove(codigo: string): Promise<void> {
    const banco = await this.findOne(codigo);
    try {
      await this.bancoRepository.remove(banco);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        ((error.driverError as { code?: string })?.code === FOREIGN_KEY_VIOLATION ||
          (error.driverError as { code?: string })?.code === RESTRICT_VIOLATION)
      ) {
        throw new ConflictException(
          `No se puede eliminar el banco ${codigo} porque tiene cuentas bancarias asociadas`,
        );
      }
      throw error;
    }
  }
}
