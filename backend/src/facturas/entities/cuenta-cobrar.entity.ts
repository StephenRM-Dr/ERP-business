import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Factura } from './factura.entity';
import { ReciboCobroDetalle } from './recibo-cobro-detalle.entity';

@Entity('cuentas_cobrar')
export class CuentaCobrar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  cliente_id: number;

  @Column({ type: 'varchar', length: 20 })
  tipo_documento: string;

  @Column({ type: 'varchar', length: 40 })
  numero_documento: string;

  @Column({ type: 'integer', nullable: true })
  factura_id: number;

  @OneToOne(() => Factura, (factura) => factura.cxc)
  @JoinColumn({ name: 'factura_id' })
  factura: Factura;

  @Column({ type: 'integer', nullable: true })
  devolucion_id: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_emision: Date;

  @Column({ type: 'date' })
  fecha_vencimiento: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  monto_original: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  saldo_pendiente: number;

  @Column({ type: 'integer' })
  moneda_id: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  tasa_cambio: number;

  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  status: string;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @OneToMany(() => ReciboCobroDetalle, (detalle) => detalle.cxc)
  recibosDetalles: ReciboCobroDetalle[];
}
