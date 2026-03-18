import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsString,
  IsOptional,
  IsDate,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { RollState } from "../../roll/entities/roll.entity";

export class CreateRollStateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  rollKey: string; // _key of the roll document

  @ApiProperty({ enum: RollState })
  @IsEnum(RollState)
  state: RollState;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
