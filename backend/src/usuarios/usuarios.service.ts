import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from './entities/usuario.entity';

const UNIQUE_VIOLATION = '23505';
const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  private async save(usuario: Usuario): Promise<Usuario> {
    try {
      return await this.usuarioRepository.save(usuario);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          `Ya existe un usuario con ese username o email`,
        );
      }
      throw error;
    }
  }

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const dto = { ...createUsuarioDto };
    // Hashear la contraseña antes de persistir
    dto.clave_hash = await bcrypt.hash(dto.clave_hash, BCRYPT_ROUNDS);
    const usuario = this.usuarioRepository.create(dto);
    return await this.save(usuario);
  }

  async findAll(): Promise<Usuario[]> {
    return await this.usuarioRepository.find({
      order: { id: 'DESC' },
      relations: { rol: { permisos: true }, sucursal: true },
    });
  }

  async findOne(username: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { username },
      relations: { rol: true, sucursal: true },
    });
    if (!usuario) {
      throw new NotFoundException(
        `Usuario con username ${username} no encontrado`,
      );
    }
    return usuario;
  }

  async findOneById(id: number): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: { rol: true, sucursal: true },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return usuario;
  }

  async update(
    username: string,
    updateUsuarioDto: UpdateUsuarioDto,
  ): Promise<Usuario> {
    const usuario = await this.findOne(username);
    const dto = { ...updateUsuarioDto };
    // Si se envía una nueva contraseña en el PATCH, hashearla también
    if (dto.clave_hash) {
      dto.clave_hash = await bcrypt.hash(dto.clave_hash, BCRYPT_ROUNDS);
    }
    
    // Si el rol_id cambia, incrementar la versión de sesión para forzar re-login
    if (dto.rol_id !== undefined && dto.rol_id !== usuario.rol_id) {
      usuario.sesion_version = (usuario.sesion_version || 1) + 1;
    }

    // Workaround para TypeORM: al cargar las relaciones completas en findOne, 
    // TypeORM prioriza el objeto cargado (stale) por encima del ID escalar nuevo al guardar.
    // Eliminando los objetos forzamos a que respete el ID nuevo mapeado en el dto.
    delete (usuario as any).rol;
    delete (usuario as any).sucursal;

    this.usuarioRepository.merge(usuario, dto);
    return await this.save(usuario);
  }

  async remove(username: string): Promise<void> {
    const usuario = await this.findOne(username);
    await this.usuarioRepository.remove(usuario);
  }

  async findAdmins(): Promise<Usuario[]> {
    return await this.usuarioRepository.find({
      where: { rol_id: 1, activo: true },
      relations: { rol: { permisos: true } },
    });
  }
}
