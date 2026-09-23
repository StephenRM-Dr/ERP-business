import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuentaPagar } from './entities/cuenta-pagar.entity';
import { CreateCuentaPagarDto } from './dto/create-cuenta-pagar.dto';
import { UpdateCuentaPagarDto } from './dto/update-cuenta-pagar.dto';

const PG_FK = '23503';
const PG_RESTRICT = '23001'; // ON DELETE RESTRICT — código separado de 23503

@Injectable()
export class CuentasPagarService {
  constructor(
    @InjectRepository(CuentaPagar)
    private readonly repo: Repository<CuentaPagar>,
  ) {}

  private pgCode = (e: any) => e?.code ?? e?.driverError?.code;

  async create(dto: CreateCuentaPagarDto): Promise<CuentaPagar> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(proveedorId?: number, status?: string): Promise<CuentaPagar[]> {
    const where: any = {};
    if (proveedorId) where.proveedor_id = proveedorId;
    if (status) where.status = status;
    return this.repo.find({ where, order: { fecha_vencimiento: 'ASC' } });
  }

  async findOne(id: number): Promise<CuentaPagar> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Cuenta por pagar con ID ${id} no encontrada`);
    return c;
  }

  async update(id: number, dto: UpdateCuentaPagarDto): Promise<CuentaPagar> {
    const c = await this.findOne(id);
    this.repo.merge(c, dto);
    return this.repo.save(c);
  }

  async remove(id: number): Promise<void> {
    const c = await this.findOne(id);
    try { await this.repo.remove(c); }
    catch (e) {
      if (this.pgCode(e) === PG_FK || this.pgCode(e) === PG_RESTRICT) throw new ConflictException('No se puede eliminar la cuenta porque tiene pagos asociados');
      throw e;
    }
  }
}
