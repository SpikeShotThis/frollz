import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { FilmStatsService } from "./application/film-stats.service";

@ApiTags("Film Stats")
@Controller("films/stats")
export class FilmStatsController {
  constructor(private readonly filmStatsService: FilmStatsService) {}

  @Get("by-state")
  @ApiOperation({ summary: "Film count grouped by current transition state" })
  byState() {
    return this.filmStatsService.countByCurrentState();
  }

  @Get("by-month")
  @ApiOperation({
    summary: "Film count grouped by month of first state transition",
  })
  @ApiQuery({
    name: "months",
    required: false,
    type: Number,
    description: "Number of months to look back (default 12)",
  })
  byMonth(@Query("months") rawMonths?: string) {
    const months = rawMonths !== undefined ? parseInt(rawMonths, 10) : 12;
    if (isNaN(months) || months < 1 || months > 120) {
      throw new BadRequestException(
        "months must be a number between 1 and 120",
      );
    }
    return this.filmStatsService.countByFirstStateMonth(months);
  }

  @Get("by-emulsion")
  @ApiOperation({ summary: "Film count grouped by emulsion" })
  byEmulsion() {
    return this.filmStatsService.countByEmulsion();
  }

  @Get("lifecycle-durations")
  @ApiOperation({
    summary: "Average days between consecutive state transitions",
  })
  lifecycleDurations() {
    return this.filmStatsService.avgTransitionDurations();
  }
}
