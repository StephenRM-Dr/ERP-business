import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendedor } from './entities/vendedor.entity';
import { CreateVendedorDto } from './dto/create-vendedor.dto';
import { UpdateVendedorDto } from './dto/update-vendedor.dto';

const PG_UNIQUE = '23505';
const PG_FK = '23503';
const PG_RESTRICT = '23001'; // ON DELETE RESTRICT — código separado de 23503

@Injectable()
export class VendedoresService {
  constructor(
    @InjectRepository(Vendedor)
    private readonly repo: Repository<Vendedor>,
  ) {}

  private pgCode = (e: any) => e?.code ?? e?.driverError?.code;

  async create(dto: CreateVendedorDto): Promise<Vendedor> {
    try { return await this.repo.save(this.repo.create(dto)); }
    catch (e) {
      if (this.pgCode(e) === PG_UNIQUE) throw new ConflictException('Ya existe un vendedor con ese código');
      throw e;
    }
  }

  findAll(): Promise<Vendedor[]> { return this.repo.find({ order: { id: 'DESC' } }); }

  async findOne(id: number): Promise<Vendedor> {
    const v = await this.repo.findOne({ where: { id } });
    if (!v) throw new NotFoundException(`Vendedor con ID ${id} no encontrado`);
    return v;
  }

  async update(id: number, dto: UpdateVendedorDto): Promise<Vendedor> {
    const v = await this.findOne(id);
    this.repo.merge(v, dto);
    try { return await this.repo.save(v); }
    catch (e) {
      if (this.pgCode(e) === PG_UNIQUE) throw new ConflictException('Ya existe un vendedor con ese código');
      throw e;
    }
  }

  async remove(id: number): Promise<void> {
    const v = await this.findOne(id);
    try { await this.repo.remove(v); }
    catch (e) {
      if (this.pgCode(e) === PG_FK || this.pgCode(e) === PG_RESTRICT) throw new ConflictException(`No se puede eliminar el vendedor "${v.nombre}" porque tiene registros asociados`);
      throw e;
    }
  }
}
