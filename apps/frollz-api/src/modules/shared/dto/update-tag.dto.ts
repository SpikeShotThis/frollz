import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateTagDto {
  @ApiPropertyOptional({ example: "Expired" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: "#ff0000" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  colorCode?: string;

  @ApiPropertyOptional({ example: "Film past its expiration date" })
  @IsOptional()
  @IsString()
  description?: string;
}
