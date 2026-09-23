import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasasCambioService } from './tasas-cambio.service';
import { TasasCambioController } from './tasas-cambio.controller';
import { TasaCambio } from './entities/tasa-cambio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TasaCambio])],
  controllers: [TasasCambioController],
  providers: [TasasCambioService],
  exports: [TasasCambioService],
})
export class TasasCambioModule {}
