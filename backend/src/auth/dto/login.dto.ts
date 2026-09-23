import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Nombre de usuario', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  username: string;

  @ApiProperty({ description: 'Contraseña en texto plano' })
  @IsString()
  password: string;
}
