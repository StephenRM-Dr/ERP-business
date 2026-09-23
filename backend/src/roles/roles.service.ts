import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { Rol } from './entities/rol.entity';
import { Permiso } from '../permisos/entities/permiso.entity';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
    @InjectRepository(Permiso)
    private readonly permisoRepository: Repository<Permiso>,
  ) {}

  private async save(rol: Rol): Promise<Rol> {
    try {
      return await this.rolRepository.save(rol);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(`Ya existe un rol con ese nombre`);
      }
      throw error;
    }
  }

  async create(createRolDto: CreateRolDto): Promise<Rol> {
    const rol = this.rolRepository.create(createRolDto);
    return await this.save(rol);
  }

  async findAll(): Promise<Rol[]> {
    return await this.rolRepository.find({
      order: { id: 'DESC' },
      relations: { permisos: true },
    });
  }

  async findOne(id: number): Promise<Rol> {
    // Incluimos los permisos para poder premarcar los checkboxes en el frontend
    const rol = await this.rolRepository.findOne({
      where: { id },
      relations: { permisos: true },
    });
    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }
    return rol;
  }

  async update(id: number, updateRolDto: UpdateRolDto): Promise<Rol> {
    const rol = await this.findOne(id);
    this.rolRepository.merge(rol, updateRolDto);
    return await this.save(rol);
  }

  async remove(id: number): Promise<void> {
    const rol = await this.findOne(id);
    await this.rolRepository.remove(rol);
  }

  /**
   * Reemplaza el conjunto completo de permisos de un rol.
   * Recibe la lista completa de IDs marcados y hace un replace-all
   * (TypeORM borra los anteriores de rol_permisos y asigna los nuevos).
   */
  async updatePermisos(id: number, permisoIds: number[]): Promise<Rol> {
    const rol = await this.findOne(id);
    rol.permisos = permisoIds.length
      ? await this.permisoRepository.findBy({ id: In(permisoIds) })
      : [];
    return await this.rolRepository.save(rol);
  }
}
