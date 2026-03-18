import { ApiProperty } from "@nestjs/swagger";

export class Tag {
  @ApiProperty()
  _key?: string;

  @ApiProperty()
  value: string;

  @ApiProperty()
  color: string; // Hex color, e.g. #F97316

  @ApiProperty({ required: false })
  isRollScoped?: boolean;

  @ApiProperty({ required: false })
  isStockScoped?: boolean;

  @ApiProperty({ required: false })
  isSystem?: boolean;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}
