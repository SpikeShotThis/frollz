import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

export class UpdateFormatDto {
  @ApiPropertyOptional({
    description: "ID of the parent package",
    example: "1",
  })
  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  packageId?: number;

  @ApiPropertyOptional({ example: "35mm" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
