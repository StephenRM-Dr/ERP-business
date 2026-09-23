import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Serial } from './entities/serial.entity';
import { CreateSerialDto } from './dto/create-serial.dto';
import { UpdateSerialDto } from './dto/update-serial.dto';

const PG_UNIQUE = '23505';
const PG_FK = '23503';
const PG_RESTRICT = '23001'; // ON DELETE RESTRICT — código separado de 23503

@Injectable()
export class SerialesService {
  constructor(
    @InjectRepository(Serial)
    private readonly repo: Repository<Serial>,
  ) {}

  private pgCode = (e: any) => e?.code ?? e?.driverError?.code;

  async create(dto: CreateSerialDto): Promise<Serial> {
    try { return await this.repo.save(this.repo.create(dto)); }
    catch (e) {
      if (this.pgCode(e) === PG_UNIQUE) throw new ConflictException(`El serial "${dto.numero_serial}" ya existe`);
      throw e;
    }
  }

  findAll(productoId?: number, depositoId?: number): Promise<Serial[]> {
    const where: any = {};
    if (productoId) where.producto_id = productoId;
    if (depositoId) where.deposito_id = depositoId;
    return this.repo.find({ where, order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<Serial> {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException(`Serial con ID ${id} no encontrado`);
    return s;
  }

  async update(id: number, dto: UpdateSerialDto): Promise<Serial> {
    const s = await this.findOne(id);
    this.repo.merge(s, dto);
    try { return await this.repo.save(s); }
    catch (e) {
      if (this.pgCode(e) === PG_UNIQUE) throw new ConflictException(`El serial "${dto.numero_serial}" ya existe`);
      throw e;
    }
  }

  async remove(id: number): Promise<void> {
    const s = await this.findOne(id);
    try { await this.repo.remove(s); }
    catch (e) {
      if (this.pgCode(e) === PG_FK || this.pgCode(e) === PG_RESTRICT) throw new ConflictException(`No se puede eliminar el serial "${s.numero_serial}" porque tiene referencias asociadas`);
      throw e;
    }
  }
}
