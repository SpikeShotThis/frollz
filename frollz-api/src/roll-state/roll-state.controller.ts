import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { RollStateService } from "./roll-state.service";
import { RollStateHistory } from "./entities/roll-state.entity";

@ApiTags("roll-states")
@Controller("roll-states")
export class RollStateController {
  constructor(private readonly rollStateService: RollStateService) {}

  @Get()
  @ApiOperation({ summary: "Get state history for a roll" })
  @ApiQuery({
    name: "rollKey",
    required: true,
    description: "The _key of the roll",
  })
  @ApiResponse({
    status: 200,
    description: "State history retrieved",
    type: [RollStateHistory],
  })
  findByRollKey(
    @Query("rollKey") rollKey: string,
  ): Promise<RollStateHistory[]> {
    if (!rollKey)
      throw new BadRequestException("rollKey query parameter is required");
    return this.rollStateService.findByRollKey(rollKey);
  }
}
