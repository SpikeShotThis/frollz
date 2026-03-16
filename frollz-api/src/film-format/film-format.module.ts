import { Module } from '@nestjs/common';
import { FilmFormatService } from './film-format.service';
import { FilmFormatController } from './film-format.controller';

@Module({
  controllers: [FilmFormatController],
  providers: [FilmFormatService],
  exports: [FilmFormatService],
})
export class FilmFormatModule {}