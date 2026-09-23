import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnulacionesService } from './anulaciones.service';
import { AnulacionesController } from './anulaciones.controller';
import { Factura } from '../facturas/entities/factura.entity';
import { CuentaCobrar } from '../facturas/entities/cuenta-cobrar.entity';
import { FacturaCompra } from '../compras/entities/compra.entity';
import { CuentaPagar } from '../cuentas-pagar/entities/cuenta-pagar.entity';
import { Devolucion } from '../devoluciones/entities/devolucion.entity';
import { ReciboCobro } from '../facturas/entities/recibo-cobro.entity';
import { ReciboCobroDetalle } from '../facturas/entities/recibo-cobro-detalle.entity';
import { PagoProveedor, PagoProveedorDetalle } from '../pagos-proveedores/entities/pago-proveedor.entity';
import { Transferencia } from '../transferencias/entities/transferencia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Factura,
      CuentaCobrar,
      FacturaCompra,
      CuentaPagar,
      Devolucion,
      ReciboCobro,
      ReciboCobroDetalle,
      PagoProveedor,
      PagoProveedorDetalle,
      Transferencia,
      Usuario,
    ]),
  ],
  controllers: [AnulacionesController],
  providers: [AnulacionesService],
  exports: [AnulacionesService],
})
export class AnulacionesModule {}
