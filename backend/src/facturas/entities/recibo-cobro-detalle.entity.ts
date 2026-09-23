import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReciboCobro } from './recibo-cobro.entity';
import { CuentaCobrar } from './cuenta-cobrar.entity';

@Entity('recibo_cobro_detalles')
export class ReciboCobroDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  recibo_id: number;

  @Column({ type: 'integer' })
  cxc_id: number;

  @ManyToOne(() => CuentaCobrar, (cxc) => cxc.recibosDetalles)
  @JoinColumn({ name: 'cxc_id' })
  cxc: CuentaCobrar;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  monto_aplicado: number;

  @ManyToOne(() => ReciboCobro, (r) => r.detalles)
  @JoinColumn({ name: 'recibo_id' })
  recibo: ReciboCobro;
}
