import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevolucionesService } from './devoluciones.service';
import { DevolucionesController } from './devoluciones.controller';
import { Devolucion } from './entities/devolucion.entity';
import { DevolucionItem } from './entities/devolucion-item.entity';
import { Factura } from '../facturas/entities/factura.entity';
import { FacturaItem } from '../facturas/entities/factura-item.entity';
import { Stock } from '../stock/entities/stock.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CuentaCobrar } from '../facturas/entities/cuenta-cobrar.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Devolucion,
      DevolucionItem,
      Factura,
      FacturaItem,
      Stock,
      Usuario,
      CuentaCobrar,
    ]),
  ],
  controllers: [DevolucionesController],
  providers: [DevolucionesService],
})
export class DevolucionesModule {}
