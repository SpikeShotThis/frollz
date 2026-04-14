import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/persistence/database.module';
import { CAMERA_REPOSITORY } from '../../domain/camera/repositories/camera.repository.interface';
import { CameraKnexRepository } from '../../infrastructure/persistence/camera/camera.knex.repository';
import { CameraService } from './application/camera.service';
import { CameraController } from './camera.controller';
import { NOTE_REPOSITORY } from '../../domain/shared/repositories/note.repository.interface';
import { NoteKnexRepository } from '../../infrastructure/persistence/shared/note.knex.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: CAMERA_REPOSITORY, useClass: CameraKnexRepository },
    { provide: NOTE_REPOSITORY, useClass: NoteKnexRepository },
    CameraService,
  ],
  controllers: [CameraController],
})
export class CameraModule { }
