import { ApiProperty } from '@nestjs/swagger';

export enum FormFactor {
  ROLL = 'Roll',
  SHEET = 'Sheet',
  INSTANT = 'Instant',
  BULK_100FT = '100ft Bulk',
  BULK_400FT = '400ft Bulk',
}

export enum Format {
  MM35 = '35mm',
  MM110 = '110',
  MINI = 'Mini',
  WIDE = 'Wide',
  SQUARE = 'Square',
  MM120 = '120',
  MM220 = '220',
  FOURX5 = '4x5',
  EIGHTX10 = '8x10',
  I_TYPE = 'I-Type',
  SIX_HUNDRED = '600',
  SX_70 = 'SX-70',
  GO = 'GO',
}

export class FilmFormat {
  @ApiProperty()
  _key?: string;

  @ApiProperty({ enum: FormFactor })
  formFactor: FormFactor;

  @ApiProperty({ enum: Format })
  format: Format;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}