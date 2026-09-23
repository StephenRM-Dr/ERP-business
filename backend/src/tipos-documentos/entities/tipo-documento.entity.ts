import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('tipos_documentos')
@Unique('uq_sucursal_codigo_doc', ['sucursal_id', 'codigo'])
export class TipoDocumento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sucursal_id: number;

  @Column({ length: 10 })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ default: 0 })
  correlativo_actual: number;

  @Column({ default: 8 })
  longitud_formato: number;

  @Column({ length: 10, nullable: true })
  prefijo: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  actualizado_en: Date;
}
