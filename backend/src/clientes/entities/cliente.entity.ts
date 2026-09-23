import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('clientes')
export class Cliente {
  @ApiProperty({ description: 'ID único del cliente' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'El nombre del cliente', maxLength: 150 })
  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @ApiPropertyOptional({
    description: 'El apellido del cliente',
    maxLength: 150,
  })
  @Column({ type: 'varchar', length: 150, nullable: true })
  apellido: string;

  @ApiPropertyOptional({
    description: 'El tipo de documento del cliente',
    maxLength: 5,
  })
  @Column({ type: 'varchar', length: 5, nullable: true })
  tipo_documento: string;

  @ApiPropertyOptional({
    description: 'El número de documento del cliente',
    maxLength: 50,
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  numero_documento: string;

  @ApiPropertyOptional({
    description: 'El correo electrónico del cliente',
    maxLength: 100,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string;

  @ApiPropertyOptional({
    description: 'El número de teléfono del cliente',
    maxLength: 40,
  })
  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string;

  @ApiPropertyOptional({ description: 'El límite de crédito del cliente' })
  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  limite_credito: number;

  @ApiPropertyOptional({ description: 'Los días de crédito del cliente' })
  @Column({ type: 'int', default: 0 })
  dias_credito: number;

  @ApiPropertyOptional({ description: 'Notas adicionales sobre el cliente' })
  @Column({ type: 'text', nullable: true })
  notas: string;

  @ApiPropertyOptional({
    description: 'Indica si el cliente es contribuyente especial',
  })
  @Column({ type: 'boolean', default: false })
  contribuyente_especial: boolean;
}
