import { ApiProperty } from '@nestjs/swagger';

export class StockTag {
  @ApiProperty()
  _key?: string;

  @ApiProperty()
  tagKey: string;

  @ApiProperty()
  stockKey: string;

  @ApiProperty({ required: false })
  createdAt?: Date;
}
