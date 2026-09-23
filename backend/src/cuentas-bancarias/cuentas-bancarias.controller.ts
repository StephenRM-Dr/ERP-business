import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { CreateCuentaBancariaDto } from './dto/create-cuenta-bancaria.dto';
import { UpdateCuentaBancariaDto } from './dto/update-cuenta-bancaria.dto';
import { CuentaBancaria } from './entities/cuenta-bancaria.entity';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('cuentas-bancarias')
@Controller('cuentas-bancarias')
export class CuentasBancariasController {
  constructor(
    private readonly cuentasBancariasService: CuentasBancariasService,
  ) {}

  @Post()
  @RequirePermission('master.cuentasBancarias')
  @ApiOperation({ summary: 'Crear una nueva cuenta bancaria' })
  // Este endpoint maneja la creación de cuentas asociadas a bancos y monedas
  @ApiResponse({
    status: 201,
    description: 'La cuenta ha sido creada exitosamente.',
    type: CuentaBancaria,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - El número de cuenta ya existe.',
  })
  create(@Body() createCuentaBancariaDto: CreateCuentaBancariaDto) {
    return this.cuentasBancariasService.create(createCuentaBancariaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las cuentas bancarias' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cuentas bancarias.',
    type: [CuentaBancaria],
  })
  findAll() {
    return this.cuentasBancariasService.findAll();
  }

  @Get(':numero_cuenta')
  @ApiOperation({ summary: 'Obtener una cuenta bancaria por su número' })
  @ApiResponse({
    status: 200,
    description: 'La cuenta bancaria encontrada.',
    type: CuentaBancaria,
  })
  @ApiResponse({ status: 404, description: 'Cuenta bancaria no encontrada.' })
  findOne(@Param('numero_cuenta') numero_cuenta: string) {
    return this.cuentasBancariasService.findOne(numero_cuenta);
  }

  @Patch(':numero_cuenta')
  @RequirePermission('master.cuentasBancarias')
  @ApiOperation({ summary: 'Actualizar una cuenta bancaria' })
  @ApiResponse({
    status: 200,
    description: 'La cuenta ha sido actualizada exitosamente.',
    type: CuentaBancaria,
  })
  @ApiResponse({ status: 404, description: 'Cuenta bancaria no encontrada.' })
  update(
    @Param('numero_cuenta') numero_cuenta: string,
    @Body() updateCuentaBancariaDto: UpdateCuentaBancariaDto,
  ) {
    return this.cuentasBancariasService.update(
      numero_cuenta,
      updateCuentaBancariaDto,
    );
  }

  @Delete(':numero_cuenta')
  @RequirePermission('master.cuentasBancarias')
  @ApiOperation({ summary: 'Eliminar una cuenta bancaria' })
  @ApiResponse({
    status: 200,
    description: 'La cuenta ha sido eliminada exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Cuenta bancaria no encontrada.' })
  remove(@Param('numero_cuenta') numero_cuenta: string) {
    return this.cuentasBancariasService.remove(numero_cuenta);
  }
}
