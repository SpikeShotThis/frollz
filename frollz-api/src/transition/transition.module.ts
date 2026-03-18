import { Module } from "@nestjs/common";
import { TransitionService } from "./transition.service";
import { TransitionController } from "./transition.controller";

@Module({
  controllers: [TransitionController],
  providers: [TransitionService],
  exports: [TransitionService],
})
export class TransitionModule {}
