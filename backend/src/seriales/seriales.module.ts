import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SerialesService } from './seriales.service';
import { SerialesController } from './seriales.controller';
import { Serial } from './entities/serial.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Serial])],
  controllers: [SerialesController],
  providers: [SerialesService],
  exports: [SerialesService],
})
export class SerialesModule {}
