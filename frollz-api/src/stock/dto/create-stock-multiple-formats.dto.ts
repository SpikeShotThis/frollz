import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsString,
  IsInt,
  IsOptional,
  IsUrl,
  IsArray,
  ArrayMinSize,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { Process } from "../entities/stock.entity";

export class CreateStockMultipleFormatsDto {
  @ApiProperty({
    type: [String],
    description: "Array of format keys to create stocks for",
  })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one format must be selected" })
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  formatKeys: string[];

  @ApiProperty({ enum: Process })
  @IsEnum(Process)
  process: Process;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  manufacturer: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  brand: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  baseStockKey?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(25600)
  speed: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  boxImageUrl?: string;
}
