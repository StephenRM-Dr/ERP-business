import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacturasService } from './facturas.service';
import { FacturasController } from './facturas.controller';
import { Factura } from './entities/factura.entity';
import { FacturaItem } from './entities/factura-item.entity';
import { CuentaCobrar } from './entities/cuenta-cobrar.entity';
import { ReciboCobro } from './entities/recibo-cobro.entity';
import { ReciboCobroDetalle } from './entities/recibo-cobro-detalle.entity';
import { FacturaVendedor } from './entities/factura-vendedor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Factura,
      FacturaItem,
      CuentaCobrar,
      ReciboCobro,
      ReciboCobroDetalle,
      FacturaVendedor,
    ]),
  ],
  controllers: [FacturasController],
  providers: [FacturasService],
  exports: [FacturasService],
})
export class FacturasModule {}
