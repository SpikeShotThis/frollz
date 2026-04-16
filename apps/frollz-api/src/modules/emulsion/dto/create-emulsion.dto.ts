import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

export class CreateEmulsionDto {
  @ApiProperty({ example: "Kodak" })
  @IsString()
  @IsNotEmpty()
  brand!: string;

  @ApiProperty({ example: "Kodak Alaris" })
  @IsString()
  @IsNotEmpty()
  manufacturer!: string;

  @ApiProperty({ example: 400 })
  @IsNumber()
  @IsPositive()
  speed!: number;

  @ApiProperty({
    description: "ID of the process (e.g. C-41, E-6)",
    example: "1",
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  processId!: number;

  @ApiProperty({
    description: "ID of the format (e.g. 35mm, 120)",
    example: "1",
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  formatId!: number;

  @ApiPropertyOptional({
    description: "ID of the base emulsion this is derived from",
    example: "1",
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  parentId?: number;
}
