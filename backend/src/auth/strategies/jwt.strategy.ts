import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsuariosService } from '../../usuarios/usuarios.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usuariosService: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Verificar si la versión de sesión sigue siendo válida (previene uso de tokens viejos tras un cambio de rol)
    try {
      const usuario = await this.usuariosService.findOneById(payload.sub);
      if (usuario.sesion_version > (payload.sesion_version || 1)) {
        throw new UnauthorizedException('Sesión expirada debido a un cambio en los permisos de la cuenta');
      }
    } catch (e) {
      throw new UnauthorizedException('Usuario no válido');
    }

    return {
      id: payload.sub,
      username: payload.username,
      rolId: payload.rol_id,
      sucursalId: payload.sucursal_id,
      empresaId: payload.empresa_id,
      permisos: payload.permisos || [],
    };
  }
}
