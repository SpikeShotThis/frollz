import { ApiProperty } from '@nestjs/swagger';

export class Tag {
  @ApiProperty()
  _key?: string;

  @ApiProperty()
  value: string;

  @ApiProperty()
  color: string; // Hex color, e.g. #F97316

  @ApiProperty({ required: false })
  createdAt?: Date;
}
