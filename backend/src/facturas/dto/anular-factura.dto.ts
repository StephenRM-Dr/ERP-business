import { IsString, IsNotEmpty } from 'class-validator';

export class AnularFacturaDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de anulación es obligatorio' })
  motivo: string;
}
