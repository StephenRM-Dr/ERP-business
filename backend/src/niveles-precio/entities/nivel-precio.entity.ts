import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('niveles_precio')
export class NivelPrecio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  nombre: string;

  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 })
  factor_utilidad_defecto: number;
}
