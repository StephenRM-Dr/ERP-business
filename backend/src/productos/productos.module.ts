import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Producto } from './entities/producto.entity';
import { ProductoCosto } from './entities/producto-costo.entity';
import { ProductoPrecio } from './entities/producto-precio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, ProductoCosto, ProductoPrecio])],
  controllers: [ProductosController],
  providers: [ProductosService],
  exports: [ProductosService],
})
export class ProductosModule {}
