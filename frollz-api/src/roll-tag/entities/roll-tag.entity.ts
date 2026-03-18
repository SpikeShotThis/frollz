import { ApiProperty } from "@nestjs/swagger";

export class RollTag {
  @ApiProperty()
  _key?: string;

  @ApiProperty()
  rollKey: string;

  @ApiProperty()
  tagKey: string;

  @ApiProperty({ required: false })
  createdAt?: Date;
}
