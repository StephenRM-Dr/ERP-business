import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RestablecerSistemaDto } from './dto/restablecer-sistema.dto';
import { SistemaService } from './sistema.service';

@ApiTags('Sistema')
@ApiBearerAuth('JWT')
@Controller('sistema')
export class SistemaController {
  constructor(private readonly sistemaService: SistemaService) {}

  @Post('restablecer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restablecer sistema (Solo Administradores)',
    description:
      'Limpia la base de datos dejando las tablas de operaciones o de fábrica limpias y reiniciando correlativos a 0.',
  })
  @ApiResponse({ status: 200, description: 'Sistema restablecido correctamente' })
  async restablecer(
    @Body() dto: RestablecerSistemaDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // Verificación de Administrador (rolId 1, username admin o permiso master.usuarios)
    const esAdmin =
      Number(user?.rolId) === 1 ||
      user?.username?.toLowerCase() === 'admin' ||
      user?.permisos?.includes('master.usuarios');

    if (!esAdmin) {
      throw new ForbiddenException('Solo un usuario Administrador puede ejecutar el restablecimiento del sistema.');
    }
    return this.sistemaService.restablecerSistema(dto);
  }
}
