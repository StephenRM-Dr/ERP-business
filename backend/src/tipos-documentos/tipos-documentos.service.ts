import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoDocumento } from './entities/tipo-documento.entity';
import { CreateTipoDocumentoDto } from './dto/create-tipo-documento.dto';
import { UpdateTipoDocumentoDto } from './dto/update-tipo-documento.dto';

@Injectable()
export class TiposDocumentosService {
  constructor(
    @InjectRepository(TipoDocumento)
    private readonly tiposDocumentosRepository: Repository<TipoDocumento>,
  ) {}

  async create(createTipoDocumentoDto: CreateTipoDocumentoDto, sucursalId: number = 1) {
    const nuevoTipo = this.tiposDocumentosRepository.create({
      ...createTipoDocumentoDto,
      sucursal_id: createTipoDocumentoDto.sucursal_id ?? sucursalId,
    });
    return await this.tiposDocumentosRepository.save(nuevoTipo);
  }

  async findAll(filters?: { sucursalId?: number; codigo?: string }) {
    const where: Record<string, any> = {};
    if (filters?.sucursalId) where.sucursal_id = filters.sucursalId;
    if (filters?.codigo) where.codigo = filters.codigo.toUpperCase();
    return await this.tiposDocumentosRepository.find({
      where: Object.keys(where).length ? where : undefined,
      order: { sucursal_id: 'ASC', id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const tipo = await this.tiposDocumentosRepository.findOne({ where: { id } });
    if (!tipo) {
      throw new NotFoundException(`Tipo de documento con ID ${id} no encontrado`);
    }
    return tipo;
  }

  async update(id: number, updateTipoDocumentoDto: UpdateTipoDocumentoDto) {
    const tipo = await this.findOne(id);
    this.tiposDocumentosRepository.merge(tipo, updateTipoDocumentoDto);
    return await this.tiposDocumentosRepository.save(tipo);
  }

  async remove(id: number) {
    const tipo = await this.findOne(id);
    return await this.tiposDocumentosRepository.remove(tipo);
  }
}
