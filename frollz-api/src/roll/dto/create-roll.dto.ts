import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsDate, IsNumber, IsOptional, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { RollState, ObtainmentMethod } from '../entities/roll.entity';

export class CreateRollDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rollId?: string;

  @ApiProperty()
  @IsString()
  stockKey: string;

  @ApiProperty({ enum: RollState })
  @IsEnum(RollState)
  state: RollState;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  imagesUrl?: string;

  @ApiProperty({ required: false, default: 'current date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateObtained?: Date;

  @ApiProperty({ enum: ObtainmentMethod })
  @IsEnum(ObtainmentMethod)
  obtainmentMethod: ObtainmentMethod;

  @ApiProperty()
  @IsString()
  obtainedFrom: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expirationDate?: Date;

  @ApiProperty({ default: 0 })
  @IsNumber()
  timesExposedToXrays: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  loadedInto?: string;
}