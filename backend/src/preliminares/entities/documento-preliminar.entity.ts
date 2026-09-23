import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export type TipoPreliminar = 'FACTURA' | 'TRANSFERENCIA' | 'INV_CARGO' | 'INV_DESCARGO';

/**
 * Borrador imprimible de una factura de venta o de una transferencia.
 * No tiene correlativo, no reserva stock y se elimina cuando el documento
 * real se emite. El payload guarda el estado del formulario sin montos:
 * precios y tasa se recalculan al cargarlo.
 */
@Entity('documentos_preliminares')
export class DocumentoPreliminar {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ enum: ['FACTURA', 'TRANSFERENCIA', 'INV_CARGO', 'INV_DESCARGO'] })
  @Column({ type: 'varchar', length: 20 })
  tipo: TipoPreliminar;

  @ApiProperty({ description: 'Sucursal donde se dejó; informativo, no acota el listado' })
  @Column({ type: 'integer' })
  sucursal_id: number;

  @ApiProperty({ description: 'Quién lo dejó' })
  @Column({ type: 'integer' })
  usuario_id: number;

  @ApiProperty({
    description:
      'Texto ya resuelto para la lista: nombre del cliente, u "origen → destino"',
  })
  @Column({ type: 'varchar', length: 150 })
  etiqueta: string;

  @ApiProperty({ description: 'Estado del formulario, sin montos' })
  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;
}
