import { PartialType } from '@nestjs/swagger';
import { CreateParametroFiscalDto } from './create-parametro-fiscal.dto';
export class UpdateParametroFiscalDto extends PartialType(CreateParametroFiscalDto) {}
