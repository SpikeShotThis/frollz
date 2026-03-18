import { Module } from "@nestjs/common";
import { RollTagController } from "./roll-tag.controller";
import { RollTagService } from "./roll-tag.service";

@Module({
  controllers: [RollTagController],
  providers: [RollTagService],
  exports: [RollTagService],
})
export class RollTagModule {}
