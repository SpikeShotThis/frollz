import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ProcessService } from "./application/process.service";

@ApiTags("Processes")
@Controller("processes")
export class ProcessController {
  constructor(private readonly processService: ProcessService) {}

  @Get()
  @ApiOperation({
    summary: "List all development processes (C-41, E-6, B&W, Instant)",
  })
  findAll() {
    return this.processService.findAll();
  }
}
