import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ReciboCobroDetalle } from './recibo-cobro-detalle.entity';

@Entity('recibos_cobro')
export class ReciboCobro {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  cliente_id: number;

  @Column({ type: 'integer' })
  sucursal_id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  numero_recibo: string;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_pago: Date;

  @Column({ type: 'varchar', length: 30, default: 'BOLIVARES' })
  forma_pago: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  monto_total: number;

  @Column({ type: 'integer' })
  moneda_pago_id: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  tasa_cambio: number;

  @Column({ type: 'boolean', default: false })
  aplica_igtf: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  igtf_porcentaje: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  igtf_monto: number;

  @Column({ type: 'integer', nullable: true })
  cuenta_bancaria_id: number;

  @Column({ type: 'integer' })
  usuario_id: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @OneToMany(() => ReciboCobroDetalle, (d) => d.recibo, { cascade: true })
  detalles: ReciboCobroDetalle[];
}
