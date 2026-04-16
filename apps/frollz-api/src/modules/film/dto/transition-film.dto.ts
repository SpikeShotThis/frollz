import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class TransitionFilmDto {
  @ApiProperty({ description: "Name of the target state", example: "Loaded" })
  @IsString()
  @IsNotEmpty()
  targetStateName!: string;

  @ApiPropertyOptional({
    description: "Date the transition occurred (defaults to now)",
    example: "2026-04-10",
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: "Sent to The Lab NYC" })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description:
      "Metadata values keyed by field name. For allow_multiple fields (e.g. scansUrl), provide an array of strings.",
    example: {
      scansUrl: [
        "https://example.com/scan1.jpg",
        "https://example.com/scan2.jpg",
      ],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string | string[]>;
}
