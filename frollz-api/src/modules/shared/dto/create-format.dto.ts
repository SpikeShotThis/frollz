import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateFormatDto {
  @ApiProperty({ description: 'ID of the parent package (e.g. Roll, Sheet, Instant)', example: '1' })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  packageId!: number;

  @ApiProperty({ example: '35mm' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
