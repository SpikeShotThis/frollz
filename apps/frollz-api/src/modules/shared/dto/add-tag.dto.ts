import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive } from "class-validator";

export class AddTagDto {
  @ApiProperty({ description: "ID of the tag to associate", example: 1 })
  @IsNumber()
  @IsPositive()
  tagId!: number;
}
