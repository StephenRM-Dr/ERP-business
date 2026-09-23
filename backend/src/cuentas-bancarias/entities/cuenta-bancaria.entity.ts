import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Banco } from '../../bancos/entities/banco.entity';
import { Moneda } from '../../monedas/entities/moneda.entity';

@Entity('cuentas_bancarias')
export class CuentaBancaria {
  @ApiProperty({ description: 'ID único de la cuenta bancaria' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID del banco al que pertenece la cuenta' })
  @Column({ type: 'int' })
  banco_id: number;

  @ManyToOne(() => Banco)
  @JoinColumn({ name: 'banco_id' })
  banco: Banco;

  @ApiProperty({ description: 'Número de la cuenta', maxLength: 40 })
  @Column({ type: 'varchar', length: 40, unique: true })
  numero_cuenta: string;

  @ApiPropertyOptional({
    description: 'Tipo de cuenta (CORRIENTE, AHORROS, FIDEICOMISO, EXTRANJERA)',
  })
  @Column({ type: 'varchar', length: 30, nullable: true })
  tipo_cuenta: string;

  @ApiProperty({ description: 'ID de la moneda de la cuenta' })
  @Column({ type: 'int' })
  moneda_id: number;

  @ManyToOne(() => Moneda)
  @JoinColumn({ name: 'moneda_id' })
  moneda: Moneda;

  @ApiPropertyOptional({
    description: 'Descripción de la cuenta',
    maxLength: 100,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  descripcion: string;

  @ApiPropertyOptional({
    description: 'Saldo conciliado de la cuenta',
    default: 0.0,
  })
  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0.0 })
  saldo_conciliado: number;

  @ApiPropertyOptional({
    description: 'Indica si la cuenta está activa',
    default: true,
  })
  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
