import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'Expired' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '#ff0000' })
  @IsString()
  @IsNotEmpty()
  colorCode!: string;

  @ApiPropertyOptional({ example: 'Film past its expiration date' })
  @IsOptional()
  @IsString()
  description?: string;
}
