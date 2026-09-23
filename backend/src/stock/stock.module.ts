import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { Stock } from './entities/stock.entity';
import { Transferencia } from '../transferencias/entities/transferencia.entity';
import { TransferenciaItem } from '../transferencias/entities/transferencia-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stock, Transferencia, TransferenciaItem])],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
