import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentasPagarService } from './cuentas-pagar.service';
import { CuentasPagarController } from './cuentas-pagar.controller';
import { CuentaPagar } from './entities/cuenta-pagar.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaPagar])],
  controllers: [CuentasPagarController],
  providers: [CuentasPagarService],
  exports: [CuentasPagarService],
})
export class CuentasPagarModule {}
