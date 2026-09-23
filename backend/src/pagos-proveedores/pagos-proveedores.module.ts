import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosProveedoresService } from './pagos-proveedores.service';
import { PagosProveedoresController } from './pagos-proveedores.controller';
import { PagoProveedor, PagoProveedorDetalle } from './entities/pago-proveedor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PagoProveedor, PagoProveedorDetalle])],
  controllers: [PagosProveedoresController],
  providers: [PagosProveedoresService],
  exports: [PagosProveedoresService],
})
export class PagosProveedoresModule {}
