import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateRollTagDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  rollKey: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  tagKey: string;
}
