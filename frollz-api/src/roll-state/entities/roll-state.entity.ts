import { ApiProperty } from '@nestjs/swagger';
import { RollState } from '../../roll/entities/roll.entity';

export class RollStateHistory {
  @ApiProperty()
  _key?: string;

  @ApiProperty()
  stateId: string; // UUID

  @ApiProperty({ enum: RollState })
  state: RollState;

  @ApiProperty()
  rollId: string; // Reference to roll

  @ApiProperty()
  date: Date;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}