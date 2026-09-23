import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ImportClientesDto } from './dto/import-cliente.dto';
import { Cliente } from './entities/cliente.entity';

// Postgres error code for a unique constraint violation.
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
  ) {}

  private async save(cliente: Cliente): Promise<Cliente> {
    try {
      return await this.clienteRepository.save(cliente);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          `Ya existe un cliente con el número de documento ${cliente.numero_documento}`,
        );
      }
      throw error;
    }
  }

  async create(createClienteDto: CreateClienteDto): Promise<Cliente> {
    const cliente = this.clienteRepository.create(createClienteDto);
    return await this.save(cliente);
  }

  async findAll(take?: number, skip?: number): Promise<Cliente[]> {
    return await this.clienteRepository.find({
      order: { id: 'DESC' },
      ...(take ? { take, skip: skip ?? 0 } : {}),
    });
  }

  async findOne(numero_documento: string): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({
      where: { numero_documento },
    });
    if (!cliente) {
      throw new NotFoundException(
        `Cliente con documento ${numero_documento} no encontrado`,
      );
    }
    return cliente;
  }

  async update(
    numero_documento: string,
    updateClienteDto: UpdateClienteDto,
  ): Promise<Cliente> {
    const cliente = await this.findOne(numero_documento);
    this.clienteRepository.merge(cliente, updateClienteDto);
    return await this.save(cliente);
  }

  async remove(numero_documento: string): Promise<void> {
    const cliente = await this.findOne(numero_documento);
    await this.clienteRepository.remove(cliente);
  }

  async importar(importDto: ImportClientesDto) {
    let creados = 0;
    let actualizados = 0;
    const errores: Array<{ documento: string; motivo: string }> = [];

    // Validar y filtrar items válidos
    const validItems: typeof importDto.clientes = [];
    const seenInBatch = new Set<string>();

    for (const item of importDto.clientes) {
      const docNum = (item.numero_documento || '').trim();
      if (!docNum || !item.nombre?.trim()) {
        errores.push({
          documento: docNum || 'SIN_DOC',
          motivo: 'El nombre y el número de documento son obligatorios',
        });
        continue;
      }

      if (seenInBatch.has(docNum)) {
        // Duplicado dentro del mismo archivo
        continue;
      }
      seenInBatch.add(docNum);
      validItems.push(item);
    }

    // Procesar en lotes de 500 para máxima velocidad en PostgreSQL
    const CHUNK_SIZE = 500;
    for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
      const chunk = validItems.slice(i, i + CHUNK_SIZE);
      const chunkDocNums = chunk.map((c) => c.numero_documento.trim());

      try {
        const existingList = await this.clienteRepository.find({
          where: { numero_documento: In(chunkDocNums) },
        });
        const existingMap = new Map<string, Cliente>(
          existingList.map((c) => [c.numero_documento, c]),
        );

        const entitiesToSave: Cliente[] = [];

        for (const item of chunk) {
          const docNum = item.numero_documento.trim();
          const existing = existingMap.get(docNum);

          if (existing) {
            existing.nombre = item.nombre.trim();
            if (item.apellido !== undefined) existing.apellido = item.apellido?.trim() || '';
            if (item.tipo_documento !== undefined) existing.tipo_documento = item.tipo_documento.trim().toUpperCase();
            if (item.email !== undefined) existing.email = item.email?.trim() || '';
            if (item.telefono !== undefined) existing.telefono = item.telefono?.trim() || '';
            if (item.limite_credito !== undefined) existing.limite_credito = Number(item.limite_credito) || 0;
            if (item.dias_credito !== undefined) existing.dias_credito = Number(item.dias_credito) || 0;
            if (item.notas !== undefined) existing.notas = item.notas?.trim() || '';
            if (item.contribuyente_especial !== undefined) existing.contribuyente_especial = Boolean(item.contribuyente_especial);

            entitiesToSave.push(existing);
            actualizados++;
          } else {
            const nuevo = this.clienteRepository.create({
              nombre: item.nombre.trim(),
              apellido: item.apellido?.trim() || undefined,
              tipo_documento: (item.tipo_documento || 'V').trim().toUpperCase(),
              numero_documento: docNum,
              email: item.email?.trim() || undefined,
              telefono: item.telefono?.trim() || undefined,
              limite_credito: Number(item.limite_credito) || 0,
              dias_credito: Number(item.dias_credito) || 0,
              notas: item.notas?.trim() || undefined,
              contribuyente_especial: Boolean(item.contribuyente_especial),
            });

            entitiesToSave.push(nuevo);
            creados++;
          }
        }

        if (entitiesToSave.length > 0) {
          await this.clienteRepository.save(entitiesToSave);
        }
      } catch (err: any) {
        // Fallback a procesamiento individual si un chunk falla
        for (const item of chunk) {
          try {
            const docNum = item.numero_documento.trim();
            let c = await this.clienteRepository.findOne({ where: { numero_documento: docNum } });
            if (c) {
              c.nombre = item.nombre.trim();
              if (item.apellido !== undefined) c.apellido = item.apellido?.trim() || '';
              if (item.telefono !== undefined) c.telefono = item.telefono?.trim() || '';
              if (item.notas !== undefined) c.notas = item.notas?.trim() || '';
              await this.clienteRepository.save(c);
              actualizados++;
            } else {
              c = this.clienteRepository.create({
                nombre: item.nombre.trim(),
                apellido: item.apellido?.trim() || undefined,
                tipo_documento: (item.tipo_documento || 'V').trim().toUpperCase(),
                numero_documento: docNum,
                telefono: item.telefono?.trim() || undefined,
                notas: item.notas?.trim() || undefined,
              });
              await this.clienteRepository.save(c);
              creados++;
            }
          } catch (e: any) {
            errores.push({
              documento: item.numero_documento,
              motivo: e.message || 'Error guardando cliente',
            });
          }
        }
      }
    }

    return {
      total: importDto.clientes.length,
      creados,
      actualizados,
      errores,
    };
  }
}
