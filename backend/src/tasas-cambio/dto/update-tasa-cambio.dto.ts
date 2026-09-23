import { PartialType } from '@nestjs/swagger';
import { CreateTasaCambioDto } from './create-tasa-cambio.dto';

export class UpdateTasaCambioDto extends PartialType(CreateTasaCambioDto) {}
