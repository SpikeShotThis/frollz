import { ApiProperty } from "@nestjs/swagger";
import { RollState } from "../entities/roll.entity";
import { IsEnum, IsOptional } from "class-validator";

export class SearchRollDto {
  @ApiProperty({
    enum: RollState,
    isArray: true,
    required: false,
    description: "A list of states to filter the rolls by",
  })
  @IsOptional()
  @IsEnum(RollState, { each: true }) // 'each: true' validates each item in the array
  state?: RollState[];
}
