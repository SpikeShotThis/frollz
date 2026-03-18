import { IsOptional, IsString, MaxLength } from "class-validator";

export class TypeaheadQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
