import { ApiPropertyOptional } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

export class CreateCameraDto {
  @ApiPropertyOptional({
    description: "The brand of the camera",
    example: "Mamiya",
  })
  @IsString()
  @IsNotEmpty()
  brand!: string;

  @ApiPropertyOptional({
    description: "The model of the camera",
    example: "RB67 Pro S",
  })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiPropertyOptional({
    description: "The status of the camera",
    example: "active",
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["active", "retired", "in_repair"])
  status!: "active" | "retired" | "in_repair";

  @ApiPropertyOptional({
    description: "Additional notes about the camera",
    example: "This camera is in excellent condition.",
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: "The serial number of the camera",
    example: "123456789",
  })
  @IsString()
  @IsOptional()
  serial_number?: string;

  @ApiPropertyOptional({
    description: "The purchase price of the camera",
    example: 1200.0,
  })
  @IsOptional()
  @IsPositive()
  purchase_price?: number;

  @ApiPropertyOptional({
    description: "The date the camera was acquired",
    example: "2023-01-15",
  })
  @IsOptional()
  @IsDateString()
  acquired_at?: string;

  @ApiPropertyOptional({
    description: "IDs of formats supported by the camera",
    example: [1, 2, 3],
  })
  @IsOptional()
  @IsPositive({ each: true })
  supported_format_ids?: number[];
}
