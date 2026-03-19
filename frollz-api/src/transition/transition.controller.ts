import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { TransitionService } from "./transition.service";
import { TransitionGraph } from "./entities/transition.entity";

@ApiTags("transitions")
@Controller("transitions")
export class TransitionController {
  constructor(private readonly transitionService: TransitionService) {}

  @Get()
  @ApiOkResponse({ type: TransitionGraph })
  @ApiQuery({ name: "profile", required: false, example: "standard" })
  getGraph(@Query("profile") profile = "standard"): Promise<TransitionGraph> {
    return this.transitionService.getGraph(profile);
  }
}
