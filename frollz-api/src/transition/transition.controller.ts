import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { TransitionService } from "./transition.service";
import { TransitionGraph } from "./entities/transition.entity";

@ApiTags("transitions")
@Controller("transitions")
export class TransitionController {
  constructor(private readonly transitionService: TransitionService) {}

  @Get()
  @ApiOkResponse({ type: TransitionGraph })
  getGraph(): Promise<TransitionGraph> {
    return this.transitionService.getGraph();
  }
}
