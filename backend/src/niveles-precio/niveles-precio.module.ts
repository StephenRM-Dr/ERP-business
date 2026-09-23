import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NivelesPrecioService } from './niveles-precio.service';
import { NivelesPrecioController } from './niveles-precio.controller';
import { NivelPrecio } from './entities/nivel-precio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NivelPrecio])],
  controllers: [NivelesPrecioController],
  providers: [NivelesPrecioService],
  exports: [NivelesPrecioService],
})
export class NivelesPrecioModule {}
