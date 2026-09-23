import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RolesService } from '../roles/roles.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // 1. Buscar el usuario
    let usuario: Awaited<ReturnType<typeof this.usuariosService.findOne>>;
    try {
      usuario = await this.usuariosService.findOne(username);
    } catch {
      // findOne lanza NotFoundException — lo convertimos en 401 para no filtrar info
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Verificar contraseña contra el hash bcrypt
    const passwordValida = await bcrypt.compare(password, usuario.clave_hash);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Cargar permisos del rol (si el usuario tiene rol asignado)
    let permisos: Array<{ id: number; clave_permiso: string; modulo: string }> =
      [];
    if (usuario.rol_id) {
      try {
        const rol = await this.rolesService.findOne(usuario.rol_id);
        permisos = rol.permisos ?? [];
      } catch {
        // Si el rol no existe, continuamos sin permisos
      }
    }

    // 4. Firmar el JWT
    const empresaId = usuario.sucursal?.empresa_id ?? null;
    const payload = {
      sub: usuario.id,
      username: usuario.username,
      rol_id: usuario.rol_id ?? null,
      sucursal_id: usuario.sucursal_id ?? null,
      empresa_id: empresaId,
      permisos: permisos.map((p) => p.clave_permiso),
      sesion_version: usuario.sesion_version || 1,
    };
    const accessToken = this.jwtService.sign(payload);

    // 5. Retornar token + datos del usuario para que el frontend los guarde en store
    return {
      accessToken,
      user: {
        id: usuario.id,
        username: usuario.username,
        nombreCompleto: usuario.nombre_completo,
        email: usuario.email ?? null,
        rolId: usuario.rol_id ?? null,
        rolNombre: usuario.rol?.nombre ?? null,
        sucursalId: usuario.sucursal_id ?? null,
        empresaId,
        permisos,
      },
    };
  }

  async verifySupervisor(body: { username?: string; password: string }) {
    const { username, password } = body;
    if (!password) {
      throw new UnauthorizedException('Debe ingresar la clave del supervisor');
    }

    if (username && username.trim()) {
      let user: any = null;
      try {
        user = await this.usuariosService.findOne(username.trim());
      } catch {
        throw new UnauthorizedException('Usuario supervisor no encontrado');
      }
      if (!user.activo) {
        throw new UnauthorizedException('El usuario supervisor está inactivo');
      }
      const isValid = await bcrypt.compare(password, user.clave_hash);
      if (!isValid) {
        throw new UnauthorizedException('Clave de autorización incorrecta');
      }
      if (user.rol_id === 1) {
        return { success: true, authorizedBy: user.nombre_completo || user.username };
      }
      if (user.rol_id) {
        const rol = await this.rolesService.findOne(user.rol_id);
        const hasPerm = rol?.permisos?.some(
          (p) => p.clave_permiso === 'invoices.credit' || p.clave_permiso === 'invoices',
        );
        if (hasPerm || user.activo) {
          return { success: true, authorizedBy: user.nombre_completo || user.username };
        }
      }
      return { success: true, authorizedBy: user.nombre_completo || user.username };
    } else {
      const admins = await this.usuariosService.findAdmins();
      for (const admin of admins) {
        const isValid = await bcrypt.compare(password, admin.clave_hash);
        if (isValid) {
          return { success: true, authorizedBy: admin.nombre_completo || admin.username };
        }
      }
      throw new UnauthorizedException('Clave de autorización incorrecta');
    }
  }
}
