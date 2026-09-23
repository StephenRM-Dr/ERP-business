import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Valida las credenciales del usuario y retorna un JWT junto con los datos del usuario ' +
      '(nombre, rol, permisos). El frontend guarda el accessToken en localStorage y lo envía ' +
      'como Bearer token en peticiones protegidas futuras.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Retorna accessToken y datos del usuario.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          username: 'admin',
          nombreCompleto: 'Administrador Sistema',
          email: 'admin@example.com',
          rolId: 1,
          rolNombre: 'Administrador',
          permisos: [{ id: 1, clave_permiso: 'customers', modulo: 'Clientes' }],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('verify-supervisor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar clave de supervisor o cajero',
    description: 'Valida la clave del supervisor, administrador o cajero para autorizar operaciones restringidas o iniciar turno POS',
  })
  verifySupervisor(@Body() body: { username?: string; password: string }) {
    return this.authService.verifySupervisor(body);
  }
}
