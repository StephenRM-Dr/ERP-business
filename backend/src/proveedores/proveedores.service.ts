import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './entities/proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

const PG_UNIQUE = '23505';
const PG_FK = '23503';
const PG_RESTRICT = '23001'; // ON DELETE RESTRICT — código separado de 23503

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly repo: Repository<Proveedor>,
  ) {}

  private pgCode(err: any): string | undefined {
    return err?.code ?? err?.driverError?.code;
  }

  async create(dto: CreateProveedorDto): Promise<Proveedor> {
    try {
      return await this.repo.save(this.repo.create(dto));
    } catch (e) {
      if (this.pgCode(e) === PG_UNIQUE)
        throw new ConflictException('Ya existe un proveedor con ese código o RIF');
      throw e;
    }
  }

  findAll(): Promise<Proveedor[]> {
    return this.repo.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<Proveedor> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    return p;
  }

  async update(id: number, dto: UpdateProveedorDto): Promise<Proveedor> {
    const p = await this.findOne(id);
    this.repo.merge(p, dto);
    try {
      return await this.repo.save(p);
    } catch (e) {
      if (this.pgCode(e) === PG_UNIQUE)
        throw new ConflictException('Ya existe un proveedor con ese código o RIF');
      throw e;
    }
  }

  async remove(id: number): Promise<void> {
    const p = await this.findOne(id);
    try {
      await this.repo.remove(p);
    } catch (e) {
      if (this.pgCode(e) === PG_FK || this.pgCode(e) === PG_RESTRICT)
        throw new ConflictException(`No se puede eliminar el proveedor "${p.nombre}" porque tiene compras o cuentas asociadas`);
      throw e;
    }
  }
}
