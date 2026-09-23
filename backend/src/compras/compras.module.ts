import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { FacturaCompra, FacturaCompraDetalle } from './entities/compra.entity';
import { CuentaPagar } from '../cuentas-pagar/entities/cuenta-pagar.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FacturaCompra, FacturaCompraDetalle, CuentaPagar])],
  controllers: [ComprasController],
  providers: [ComprasService],
  exports: [ComprasService],
})
export class ComprasModule {}

