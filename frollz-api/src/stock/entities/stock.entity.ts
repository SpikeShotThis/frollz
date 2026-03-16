import { ApiProperty } from '@nestjs/swagger';

export enum Process {
  ECN_2 = 'ECN-2',
  E_6 = 'E-6',
  C_41 = 'C-41',
  BLACK_WHITE = 'Black & White',
}

export class Stock {
  @ApiProperty()
  _key?: string;

  @ApiProperty()
  formatKey: string; // Reference to film format

  @ApiProperty({ enum: Process })
  process: Process;

  @ApiProperty()
  manufacturer: string;

  @ApiProperty()
  brand: string;

  @ApiProperty({ required: false })
  baseStockKey?: string; // Reference to another stock

  @ApiProperty()
  speed: number; // ISO rating

  @ApiProperty({ required: false })
  boxImageUrl?: string;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}