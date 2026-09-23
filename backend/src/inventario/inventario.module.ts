import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { InvReglaTransformacion } from './entities/inv-regla-transformacion.entity';
import { InvTransformacion } from './entities/inv-transformacion.entity';
import { DocumentoPreliminar } from '../preliminares/entities/documento-preliminar.entity';

import { Almacen } from '../almacenes/entities/almacen.entity';
import { Stock } from '../stock/entities/stock.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Transferencia } from '../transferencias/entities/transferencia.entity';
import { TransferenciaItem } from '../transferencias/entities/transferencia-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvReglaTransformacion,
      InvTransformacion,
      DocumentoPreliminar,
      Almacen,
      Stock,
      Producto,
      Transferencia,
      TransferenciaItem,
    ]),
  ],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
