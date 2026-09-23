import {
  IsEnum,
  IsInt,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TipoDocumentoAnulable {
  FACTURA_VENTA = 'FACTURA_VENTA',
  FACTURA_COMPRA = 'FACTURA_COMPRA',
  DEVOLUCION_VENTA = 'DEVOLUCION_VENTA',
  RECIBO_COBRO = 'RECIBO_COBRO',
  PAGO_PROVEEDOR = 'PAGO_PROVEEDOR',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export class DocumentoItemRefDto {
  @ApiProperty({ enum: TipoDocumentoAnulable })
  @IsEnum(TipoDocumentoAnulable)
  tipo_documento: TipoDocumentoAnulable;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  documento_id: number;
}

export class AnularLoteDto {
  @ApiProperty({ type: [DocumentoItemRefDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentoItemRefDto)
  documentos: DocumentoItemRefDto[];

  @ApiProperty({ description: 'Motivo de la anulación' })
  @IsString()
  @MinLength(3, { message: 'El motivo debe tener al menos 3 caracteres' })
  motivo: string;

  @ApiPropertyOptional({
    description: 'Clave de administrador (obligatoria si el usuario no es admin)',
  })
  @IsOptional()
  @IsString()
  admin_password?: string;
}

export class AnularIndividualDto {
  @ApiProperty({ enum: TipoDocumentoAnulable })
  @IsEnum(TipoDocumentoAnulable)
  tipo_documento: TipoDocumentoAnulable;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  documento_id: number;

  @ApiProperty({ description: 'Motivo de la anulación' })
  @IsString()
  @MinLength(3, { message: 'El motivo debe tener al menos 3 caracteres' })
  motivo: string;

  @ApiPropertyOptional({
    description: 'Clave de administrador (obligatoria si el usuario no es admin)',
  })
  @IsOptional()
  @IsString()
  admin_password?: string;
}

export class QueryDocumentosDto {
  @ApiProperty({ enum: TipoDocumentoAnulable })
  @IsEnum(TipoDocumentoAnulable)
  tipo_documento: TipoDocumentoAnulable;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sucursal_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  solo_activos?: boolean;
}
