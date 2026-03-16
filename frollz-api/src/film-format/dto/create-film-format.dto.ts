import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { FormFactor, Format } from '../entities/film-format.entity';

export class CreateFilmFormatDto {
  @ApiProperty({ enum: FormFactor })
  @IsEnum(FormFactor)
  formFactor: FormFactor;

  @ApiProperty({ enum: Format })
  @IsEnum(Format)
  format: Format;
}