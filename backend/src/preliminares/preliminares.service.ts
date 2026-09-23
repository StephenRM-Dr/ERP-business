import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DocumentoPreliminar,
  TipoPreliminar,
} from './entities/documento-preliminar.entity';
import { CreatePreliminarDto } from './dto/create-preliminar.dto';
import { UpdatePreliminarDto } from './dto/update-preliminar.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';

/** Fila del listado: sin payload, que solo hace falta al abrir uno. */
export interface PreliminarResumen {
  id: number;
  tipo: TipoPreliminar;
  etiqueta: string;
  sucursal_id: number;
  usuario_id: number;
  usuario_nombre: string | null;
  items_count: number;
  creado_en: Date;
  actualizado_en: Date;
}

@Injectable()
export class PreliminaresService {
  constructor(
    @InjectRepository(DocumentoPreliminar)
    private readonly preliminaresRepository: Repository<DocumentoPreliminar>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  /**
   * Listado por tipo, del más reciente al más viejo. A diferencia de
   * /facturas, /almacenes y /stock, NO se acota por sucursal: es deliberado —
   * el caso de uso es retomar el preliminar que dejó otro (cambio de turno,
   * consulta entre sucursales). No es un olvido.
   */
  async findAll(tipo: TipoPreliminar): Promise<PreliminarResumen[]> {
    const preliminares = await this.preliminaresRepository.find({
      where: { tipo },
      order: { actualizado_en: 'DESC' },
    });

    const nombreById = await this.resolverNombres(
      preliminares.map((p) => p.usuario_id),
    );

    return preliminares.map((p) => ({
      id: p.id,
      tipo: p.tipo,
      etiqueta: p.etiqueta,
      sucursal_id: p.sucursal_id,
      usuario_id: p.usuario_id,
      usuario_nombre: nombreById.get(p.usuario_id) ?? null,
      items_count: Array.isArray(p.payload?.items) ? p.payload.items.length : 0,
      creado_en: p.creado_en,
      actualizado_en: p.actualizado_en,
    }));
  }

  async findOne(id: number): Promise<DocumentoPreliminar> {
    const preliminar = await this.preliminaresRepository.findOne({
      where: { id },
    });
    if (!preliminar) {
      throw new NotFoundException(`Preliminar con ID ${id} no encontrado`);
    }
    return preliminar;
  }

  create(
    dto: CreatePreliminarDto,
    usuarioId: number,
    sucursalId: number,
  ): Promise<DocumentoPreliminar> {
    const preliminar = this.preliminaresRepository.create({
      tipo: dto.tipo,
      etiqueta: dto.etiqueta,
      payload: dto.payload,
      usuario_id: usuarioId,
      sucursal_id: sucursalId,
    });
    return this.preliminaresRepository.save(preliminar);
  }

  async update(
    id: number,
    dto: UpdatePreliminarDto,
  ): Promise<DocumentoPreliminar> {
    const preliminar = await this.findOne(id);
    if (dto.etiqueta !== undefined) preliminar.etiqueta = dto.etiqueta;
    if (dto.payload !== undefined) preliminar.payload = dto.payload;
    return this.preliminaresRepository.save(preliminar);
  }

  async remove(id: number): Promise<{ id: number }> {
    const preliminar = await this.findOne(id);
    await this.preliminaresRepository.remove(preliminar);
    return { id };
  }

  /**
   * Nombre para mostrar de cada autor, con select explícito: la entidad
   * Usuario carga clave_hash, que no tiene por qué salir de este endpoint.
   */
  private async resolverNombres(
    usuarioIds: number[],
  ): Promise<Map<number, string>> {
    const ids = [...new Set(usuarioIds)];
    if (ids.length === 0) return new Map();

    const usuarios = await this.usuariosRepository.find({
      where: ids.map((id) => ({ id })),
      select: { id: true, nombre_completo: true },
    });
    return new Map(usuarios.map((u) => [u.id, u.nombre_completo]));
  }
}
