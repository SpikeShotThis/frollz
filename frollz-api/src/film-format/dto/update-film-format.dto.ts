import { PartialType } from '@nestjs/swagger';
import { CreateFilmFormatDto } from './create-film-format.dto';

export class UpdateFilmFormatDto extends PartialType(CreateFilmFormatDto) {}