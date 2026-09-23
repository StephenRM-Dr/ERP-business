import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NivelPrecio } from './entities/nivel-precio.entity';
import { CreateNivelPrecioDto } from './dto/create-nivel-precio.dto';
import { UpdateNivelPrecioDto } from './dto/update-nivel-precio.dto';

@Injectable()
export class NivelesPrecioService {
  constructor(
    @InjectRepository(NivelPrecio)
    private readonly nivelesPrecioRepository: Repository<NivelPrecio>,
  ) {}

  async create(createNivelPrecioDto: CreateNivelPrecioDto) {
    const nuevoNivel = this.nivelesPrecioRepository.create(createNivelPrecioDto);
    return await this.nivelesPrecioRepository.save(nuevoNivel);
  }

  async findAll() {
    return await this.nivelesPrecioRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const nivel = await this.nivelesPrecioRepository.findOne({ where: { id } });
    if (!nivel) {
      throw new NotFoundException(`Nivel de precio con ID ${id} no encontrado`);
    }
    return nivel;
  }

  async update(id: number, updateNivelPrecioDto: UpdateNivelPrecioDto) {
    const nivel = await this.findOne(id);
    this.nivelesPrecioRepository.merge(nivel, updateNivelPrecioDto);
    return await this.nivelesPrecioRepository.save(nivel);
  }

  async remove(id: number) {
    const nivel = await this.findOne(id);
    return await this.nivelesPrecioRepository.remove(nivel);
  }
}
