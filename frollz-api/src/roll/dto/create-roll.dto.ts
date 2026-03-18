import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsString,
  IsDate,
  IsInt,
  IsOptional,
  IsUrl,
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

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  stockKey: string;

  @ApiProperty({ enum: RollState })
  @IsEnum(RollState)
  state: RollState;

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

  @ApiProperty({ enum: ObtainmentMethod })
  @IsEnum(ObtainmentMethod)
  obtainmentMethod: ObtainmentMethod;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  obtainedFrom: string;

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
