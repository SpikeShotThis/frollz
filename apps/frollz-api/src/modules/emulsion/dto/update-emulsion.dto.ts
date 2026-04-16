import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

export class UpdateEmulsionDto {
  @ApiPropertyOptional({ example: "Kodak" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  brand?: string;

  @ApiPropertyOptional({ example: "Kodak Alaris" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  manufacturer?: string;

  @ApiPropertyOptional({ example: 400 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  speed?: number;

  @ApiPropertyOptional({ description: "ID of the process", example: "1" })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  processId?: number;

  @ApiPropertyOptional({ description: "ID of the format", example: "1" })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  formatId?: number;

  @ApiPropertyOptional({ description: "ID of the base emulsion", example: "1" })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  parentId?: number;
}
