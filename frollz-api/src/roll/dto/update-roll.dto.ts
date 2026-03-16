import { PartialType } from '@nestjs/swagger';
import { CreateRollDto } from './create-roll.dto';

export class UpdateRollDto extends PartialType(CreateRollDto) {}