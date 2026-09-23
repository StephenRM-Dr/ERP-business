import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Producto } from './producto.entity';
import { Moneda } from '../../monedas/entities/moneda.entity';

@Entity('producto_costos')
export class ProductoCosto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  producto_id: number;

  @Column()
  moneda_id: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  costo: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_vigencia: Date;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @ManyToOne(() => Moneda)
  @JoinColumn({ name: 'moneda_id' })
  moneda: Moneda;
}
