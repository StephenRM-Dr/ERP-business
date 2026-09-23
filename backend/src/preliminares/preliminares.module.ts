import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreliminaresService } from './preliminares.service';
import { PreliminaresController } from './preliminares.controller';
import { DocumentoPreliminar } from './entities/documento-preliminar.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentoPreliminar, Usuario])],
  controllers: [PreliminaresController],
  providers: [PreliminaresService],
})
export class PreliminaresModule {}
