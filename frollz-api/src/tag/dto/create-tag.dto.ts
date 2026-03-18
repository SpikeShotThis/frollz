import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsHexColor,
  MinLength,
  MaxLength,
  IsBoolean,
  IsOptional,
} from "class-validator";

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  value: string;

  @ApiProperty({ description: "Hex color code, e.g. #F97316" })
  @IsHexColor()
  color: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isRollScoped?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isStockScoped?: boolean;
}
