import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permiso } from '../../permisos/entities/permiso.entity';

@Entity('roles')
export class Rol {
  @ApiProperty({ description: 'ID único del rol' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'El nombre del rol', maxLength: 50 })
  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción del rol', maxLength: 150 })
  @Column({ type: 'varchar', length: 150, nullable: true })
  descripcion: string;

  @ApiPropertyOptional({
    description: 'Indica si el rol está activo',
    default: true,
  })
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ApiPropertyOptional({ description: 'Fecha de creación' })
  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @ApiPropertyOptional({
    description: 'Permisos asignados a este rol',
    type: () => [Permiso],
  })
  @ManyToMany(() => Permiso, (permiso) => permiso.roles)
  @JoinTable({
    name: 'rol_permisos',
    joinColumn: { name: 'rol_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permiso_id', referencedColumnName: 'id' },
  })
  permisos: Permiso[];
}
