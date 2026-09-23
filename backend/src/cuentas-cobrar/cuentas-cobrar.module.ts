import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentasCobrarService } from './cuentas-cobrar.service';
import { CuentasCobrarController } from './cuentas-cobrar.controller';
import { CuentaCobrar } from '../facturas/entities/cuenta-cobrar.entity';
import { Factura } from '../facturas/entities/factura.entity';
import { ReciboCobro } from '../facturas/entities/recibo-cobro.entity';
import { ReciboCobroDetalle } from '../facturas/entities/recibo-cobro-detalle.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Devolucion } from '../devoluciones/entities/devolucion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CuentaCobrar,
      Factura,
      ReciboCobro,
      ReciboCobroDetalle,
      Cliente,
      Devolucion,
    ]),
  ],
  controllers: [CuentasCobrarController],
  providers: [CuentasCobrarService],
  exports: [CuentasCobrarService],
})
export class CuentasCobrarModule {}
