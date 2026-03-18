import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isErrorCorrection?: boolean;
}
