import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecibosCobrosService } from './recibos-cobro.service';
import { RecibosCobrosController } from './recibos-cobro.controller';
import { ReciboCobro } from '../facturas/entities/recibo-cobro.entity';
import { ReciboCobroDetalle } from '../facturas/entities/recibo-cobro-detalle.entity';
import { CuentaCobrar } from '../facturas/entities/cuenta-cobrar.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReciboCobro, ReciboCobroDetalle, CuentaCobrar])],
  controllers: [RecibosCobrosController],
  providers: [RecibosCobrosService],
  exports: [RecibosCobrosService],
})
export class RecibosCobrosModule {}
