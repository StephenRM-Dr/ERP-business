import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Producto } from './producto.entity';
import { Moneda } from '../../monedas/entities/moneda.entity';
// Asumiendo que existirá una entidad NivelPrecio en el futuro, o referenciando por ID.

@Entity('producto_precios')
export class ProductoPrecio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  producto_id: number;

  @Column()
  nivel_precio_id: number;

  @Column()
  moneda_id: number;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  precio: number;

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
