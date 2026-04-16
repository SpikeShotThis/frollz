import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { DatabaseModule } from "../../infrastructure/persistence/database.module";
import { EMULSION_REPOSITORY } from "../../domain/emulsion/repositories/emulsion.repository.interface";
import { EMULSION_TAG_REPOSITORY } from "../../domain/emulsion-tag/repositories/emulsion-tag.repository.interface";
import { EmulsionKnexRepository } from "../../infrastructure/persistence/emulsion/emulsion.knex.repository";
import { EmulsionTagKnexRepository } from "../../infrastructure/persistence/emulsion-tag/emulsion-tag.knex.repository";
import { EmulsionService } from "./application/emulsion.service";
import { EmulsionController } from "./emulsion.controller";

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

@Module({
  imports: [
    DatabaseModule,
    MulterModule.register({ limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }),
  ],
  providers: [
    { provide: EMULSION_REPOSITORY, useClass: EmulsionKnexRepository },
    { provide: EMULSION_TAG_REPOSITORY, useClass: EmulsionTagKnexRepository },
    EmulsionService,
  ],
  controllers: [EmulsionController],
  exports: [EMULSION_REPOSITORY],
})
export class EmulsionModule {}
