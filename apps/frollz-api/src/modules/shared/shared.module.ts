import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infrastructure/persistence/database.module";
import { TAG_REPOSITORY } from "../../domain/shared/repositories/tag.repository.interface";
import { PACKAGE_REPOSITORY } from "../../domain/shared/repositories/package.repository.interface";
import { PROCESS_REPOSITORY } from "../../domain/shared/repositories/process.repository.interface";
import { FORMAT_REPOSITORY } from "../../domain/shared/repositories/format.repository.interface";
import { TagKnexRepository } from "../../infrastructure/persistence/shared/tag.knex.repository";
import { PackageKnexRepository } from "../../infrastructure/persistence/shared/package.knex.repository";
import { ProcessKnexRepository } from "../../infrastructure/persistence/shared/process.knex.repository";
import { FormatKnexRepository } from "../../infrastructure/persistence/shared/format.knex.repository";
import { TagService } from "./application/tag.service";
import { FormatService } from "./application/format.service";
import { PackageService } from "./application/package.service";
import { ProcessService } from "./application/process.service";
import { TagController } from "./tag.controller";
import { FormatController } from "./format.controller";
import { PackageController } from "./package.controller";
import { ProcessController } from "./process.controller";

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: TAG_REPOSITORY, useClass: TagKnexRepository },
    { provide: PACKAGE_REPOSITORY, useClass: PackageKnexRepository },
    { provide: PROCESS_REPOSITORY, useClass: ProcessKnexRepository },
    { provide: FORMAT_REPOSITORY, useClass: FormatKnexRepository },
    TagService,
    FormatService,
    PackageService,
    ProcessService,
  ],
  controllers: [
    TagController,
    FormatController,
    PackageController,
    ProcessController,
  ],
  exports: [
    TAG_REPOSITORY,
    PACKAGE_REPOSITORY,
    PROCESS_REPOSITORY,
    FORMAT_REPOSITORY,
  ],
})
export class SharedModule {}
