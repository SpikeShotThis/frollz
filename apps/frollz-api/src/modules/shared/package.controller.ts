import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PackageService } from "./application/package.service";

@ApiTags("Packages")
@Controller("packages")
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  @Get()
  @ApiOperation({
    summary: "List all package types (Roll, Sheet, Instant, etc.)",
  })
  findAll() {
    return this.packageService.findAll();
  }
}
