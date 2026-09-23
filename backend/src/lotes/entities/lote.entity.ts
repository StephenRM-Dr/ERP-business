import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('lotes')
export class Lote {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ type: 'integer' }) producto_id: number;
  @ApiProperty() @Column({ type: 'varchar', length: 50 }) numero_lote: string;
  @ApiProperty() @Column({ type: 'date' }) fecha_vencimiento: string;
  @ApiPropertyOptional() @CreateDateColumn({ type: 'timestamp' }) creado_en: Date;
}
