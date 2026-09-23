import { PartialType } from '@nestjs/mapped-types';
import { CreateNivelPrecioDto } from './create-nivel-precio.dto';

export class UpdateNivelPrecioDto extends PartialType(CreateNivelPrecioDto) {}
