import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnulacionesService } from './anulaciones.service';
import {
  AnularLoteDto,
  AnularIndividualDto,
  QueryDocumentosDto,
} from './dto/anular-documentos.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('anulaciones')
@RequirePermission('transacciones.anulaciones')
@Controller('anulaciones')
export class AnulacionesController {
  constructor(private readonly anulacionesService: AnulacionesService) {}

  @Get('documentos')
  @ApiOperation({ summary: 'Consultar documentos para anulación' })
  queryDocumentos(@Query() query: QueryDocumentosDto) {
    return this.anulacionesService.queryDocumentos(query);
  }

  @Post('lote')
  @ApiOperation({ summary: 'Anular lote de documentos' })
  @ApiResponse({ status: 200, description: 'Lote de documentos anulados exitosamente' })
  anularLote(
    @Body() dto: AnularLoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.anulacionesService.anularLote(dto, user);
  }

  @Post('individual')
  @ApiOperation({ summary: 'Anular un documento individual' })
  @ApiResponse({ status: 200, description: 'Documento anulado exitosamente' })
  anularIndividual(
    @Body() dto: AnularIndividualDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.anulacionesService.anularIndividual(dto, user);
  }
}
