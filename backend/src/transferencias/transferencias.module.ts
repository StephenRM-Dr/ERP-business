import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferenciasService } from './transferencias.service';
import { TransferenciasController } from './transferencias.controller';
import { Transferencia } from './entities/transferencia.entity';
import { TransferenciaItem } from './entities/transferencia-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transferencia, TransferenciaItem])],
  controllers: [TransferenciasController],
  providers: [TransferenciasService],
})
export class TransferenciasModule {}
