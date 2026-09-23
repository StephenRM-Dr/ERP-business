import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParametrosFiscalesService } from './parametros-fiscales.service';
import { ParametrosFiscalesController } from './parametros-fiscales.controller';
import { ParametroFiscal } from './entities/parametro-fiscal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParametroFiscal])],
  controllers: [ParametrosFiscalesController],
  providers: [ParametrosFiscalesService],
  exports: [ParametrosFiscalesService],
})
export class ParametrosFiscalesModule {}
