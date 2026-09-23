import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '../../roles/entities/rol.entity';

@Entity('permisos')
export class Permiso {
  @ApiProperty({ description: 'ID único del permiso' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Clave única del permiso (usada por el frontend)',
    maxLength: 100,
  })
  @Column({ type: 'varchar', length: 100, unique: true })
  clave_permiso: string;

  @ApiProperty({
    description: 'Módulo al que pertenece el permiso',
    maxLength: 50,
  })
  @Column({ type: 'varchar', length: 50 })
  modulo: string;

  @ApiPropertyOptional({
    description: 'Descripción del permiso',
    maxLength: 150,
  })
  @Column({ type: 'varchar', length: 150, nullable: true })
  descripcion: string;

  // Relación inversa — navegación opcional, no necesaria para los endpoints actuales
  @ManyToMany(() => Rol, (rol) => rol.permisos)
  roles: Rol[];
}
