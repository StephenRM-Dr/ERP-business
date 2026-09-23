import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParametroFiscal } from './entities/parametro-fiscal.entity';
import { CreateParametroFiscalDto } from './dto/create-parametro-fiscal.dto';
import { UpdateParametroFiscalDto } from './dto/update-parametro-fiscal.dto';

const PG_UNIQUE = '23505';

@Injectable()
export class ParametrosFiscalesService {
  constructor(
    @InjectRepository(ParametroFiscal)
    private readonly repo: Repository<ParametroFiscal>,
  ) {}

  private pgCode = (e: any) => e?.code ?? e?.driverError?.code;

  async create(dto: CreateParametroFiscalDto): Promise<ParametroFiscal> {
    try { return await this.repo.save(this.repo.create(dto)); }
    catch (e) {
      if (this.pgCode(e) === PG_UNIQUE) throw new ConflictException('Ya existe un parámetro fiscal con ese código');
      throw e;
    }
  }

  findAll(): Promise<ParametroFiscal[]> { return this.repo.find({ order: { id: 'DESC' } }); }

  async findOne(id: number): Promise<ParametroFiscal> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Parámetro fiscal con ID ${id} no encontrado`);
    return p;
  }

  async update(id: number, dto: UpdateParametroFiscalDto): Promise<ParametroFiscal> {
    const p = await this.findOne(id);
    this.repo.merge(p, dto);
    try { return await this.repo.save(p); }
    catch (e) {
      if (this.pgCode(e) === PG_UNIQUE) throw new ConflictException('Ya existe un parámetro fiscal con ese código');
      throw e;
    }
  }

  async remove(id: number): Promise<void> {
    const p = await this.findOne(id);
    await this.repo.remove(p);
  }
}
