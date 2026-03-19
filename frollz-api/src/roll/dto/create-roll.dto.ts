import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsString,
  IsDate,
  IsInt,
  IsOptional,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { RollState, ObtainmentMethod } from "../entities/roll.entity";

export class CreateRollDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  rollId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stockKey?: string;

  @ApiProperty({
    required: false,
    description:
      "Key of the parent bulk roll. If provided, stockKey is inherited from the parent.",
  })
  @IsOptional()
  @IsUUID()
  parentRollId?: string;

  @ApiProperty({
    required: false,
    description:
      "Set to true to create a bulk canister roll using the bulk transition profile.",
  })
  @IsOptional()
  @IsBoolean()
  isBulkRoll?: boolean;

  @ApiProperty({ enum: RollState, required: false, default: RollState.ADDED })
  @IsOptional()
  @IsEnum(RollState)
  state?: RollState;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  imagesUrl?: string;

  @ApiProperty({ required: false, default: "current date" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateObtained?: Date;

  @ApiProperty({ enum: ObtainmentMethod, required: false })
  @IsOptional()
  @IsEnum(ObtainmentMethod)
  obtainmentMethod?: ObtainmentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  obtainedFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expirationDate?: Date;

  @ApiProperty({ default: 0 })
  @IsInt()
  @Min(0)
  @Max(99)
  timesExposedToXrays: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  loadedInto?: string;
}
