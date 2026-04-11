import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TransitionFilmDto {
  @ApiProperty({ description: 'Name of the target state', example: 'Loaded' })
  @IsString()
  @IsNotEmpty()
  targetStateName!: string;

  @ApiPropertyOptional({ description: 'Date the transition occurred (defaults to now)', example: '2026-04-10' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Sent to The Lab NYC' })
  @IsOptional()
  @IsString()
  note?: string;
}
