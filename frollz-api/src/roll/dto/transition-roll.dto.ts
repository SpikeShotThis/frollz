import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { RollState } from "../entities/roll.entity";

export class TransitionRollDto {
  @ApiProperty({ enum: RollState })
  @IsEnum(RollState)
  targetState: RollState;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
