import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsHexColor, MinLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  value: string;

  @ApiProperty({ description: 'Hex color code, e.g. #F97316' })
  @IsHexColor()
  color: string;
}
