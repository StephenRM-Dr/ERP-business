import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lote } from './entities/lote.entity';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';

const PG_UNIQUE = '23505';
const PG_FK = '23503';
const PG_RESTRICT = '23001'; // ON DELETE RESTRICT — código separado de 23503

@Injectable()
export class LotesService {
  constructor(
    @InjectRepository(Lote)
    private readonly repo: Repository<Lote>,
  ) {}

  private pgCode = (e: any) => e?.code ?? e?.driverError?.code;

  async create(dto: CreateLoteDto): Promise<Lote> {
    try { return await this.repo.save(this.repo.create(dto)); }
    catch (e) {
      if (this.pgCode(e) === PG_UNIQUE) throw new ConflictException('Ya existe ese número de lote para ese producto');
      throw e;
    }
  }

  findAll(productoId?: number): Promise<Lote[]> {
    return this.repo.find({
      where: productoId ? { producto_id: productoId } : {},
      order: { fecha_vencimiento: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Lote> {
    const l = await this.repo.findOne({ where: { id } });
    if (!l) throw new NotFoundException(`Lote con ID ${id} no encontrado`);
    return l;
  }

  async update(id: number, dto: UpdateLoteDto): Promise<Lote> {
    const l = await this.findOne(id);
    this.repo.merge(l, dto);
    return this.repo.save(l);
  }

  async remove(id: number): Promise<void> {
    const l = await this.findOne(id);
    try { await this.repo.remove(l); }
    catch (e) {
      if (this.pgCode(e) === PG_FK || this.pgCode(e) === PG_RESTRICT) throw new ConflictException(`No se puede eliminar el lote "${l.numero_lote}" porque tiene stock o movimientos asociados`);
      throw e;
    }
  }
}
