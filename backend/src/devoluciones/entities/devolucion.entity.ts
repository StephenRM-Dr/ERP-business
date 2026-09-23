import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { DevolucionItem } from './devolucion-item.entity';

@Entity('devoluciones_ventas')
export class Devolucion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  sucursal_id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  numero_devolucion: string;

  @Column({ type: 'integer' })
  factura_id: number;

  @Column({ type: 'integer' })
  cliente_id: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_devolucion: Date;

  @Column({ type: 'integer' })
  moneda_id: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  tasa_cambio: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  base_exenta: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  base_imponible: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  monto_iva: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  total_neto: number;

  @Column({ type: 'integer' })
  usuario_id: number;

  @Column({ type: 'text' })
  motivo: string;

  @Column({ type: 'boolean', default: false })
  aplica_retencion_iva: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  porcentaje_retencion_iva: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  monto_retencion_iva: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  monto_iva_cobrado: number;

  @Column({ type: 'varchar', length: 50, default: 'PENDIENTE' })
  estado: string;

  @OneToMany(() => DevolucionItem, (item) => item.devolucion, { cascade: true })
  items: DevolucionItem[];
}
