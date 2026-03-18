import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ThrottleLimits } from "../common/throttle-limits";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { RollService } from "./roll.service";
import { CreateRollDto } from "./dto/create-roll.dto";
import { UpdateRollDto } from "./dto/update-roll.dto";
import { TransitionRollDto } from "./dto/transition-roll.dto";
import { Roll } from "./entities/roll.entity";

@ApiTags("rolls")
@Controller("rolls")
export class RollController {
  constructor(private readonly rollService: RollService) {}

  @Post()
  @Throttle({ default: ThrottleLimits._20_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Create a new roll" })
  @ApiResponse({
    status: 201,
    description: "Roll created successfully",
    type: Roll,
  })
  create(@Body() createRollDto: CreateRollDto): Promise<Roll> {
    return this.rollService.create(createRollDto);
  }

  @Get("next-id")
  @ApiOperation({ summary: "Get the next roll ID" })
  @ApiResponse({ status: 200, description: "Next roll ID" })
  getNextId(): Promise<string> {
    return this.rollService.getNextId();
  }

  @Get()
  @ApiOperation({ summary: "Get all rolls" })
  @ApiResponse({
    status: 200,
    description: "Rolls retrieved successfully",
    type: [Roll],
  })
  findAll(): Promise<Roll[]> {
    return this.rollService.findAll();
  }

  @Get(":key")
  @ApiOperation({ summary: "Get a roll by key" })
  @ApiResponse({
    status: 200,
    description: "Roll retrieved successfully",
    type: Roll,
  })
  @ApiResponse({ status: 404, description: "Roll not found" })
  async findOne(@Param("key") key: string): Promise<Roll> {
    const roll = await this.rollService.findOne(key);
    if (!roll) {
      throw new NotFoundException("Roll not found");
    }
    return roll;
  }

  @Patch(":key")
  @Throttle({ default: ThrottleLimits._20_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Update a roll" })
  @ApiResponse({
    status: 200,
    description: "Roll updated successfully",
    type: Roll,
  })
  @ApiResponse({ status: 404, description: "Roll not found" })
  async update(
    @Param("key") key: string,
    @Body() updateRollDto: UpdateRollDto,
  ): Promise<Roll> {
    const roll = await this.rollService.update(key, updateRollDto);
    if (!roll) {
      throw new NotFoundException("Roll not found");
    }
    return roll;
  }

  @Delete(":key")
  @Throttle({ default: ThrottleLimits._20_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Delete a roll" })
  @ApiResponse({ status: 200, description: "Roll deleted successfully" })
  @ApiResponse({ status: 404, description: "Roll not found" })
  async remove(@Param("key") key: string): Promise<{ message: string }> {
    const deleted = await this.rollService.remove(key);
    if (!deleted) {
      throw new NotFoundException("Roll not found");
    }
    return { message: "Roll deleted successfully" };
  }

  @Post(":key/transition")
  @Throttle({ default: ThrottleLimits._20_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Transition a roll to a new storage state" })
  @ApiResponse({
    status: 200,
    description: "Roll transitioned successfully",
    type: Roll,
  })
  @ApiResponse({ status: 400, description: "Invalid state transition" })
  @ApiResponse({ status: 404, description: "Roll not found" })
  async transition(
    @Param("key") key: string,
    @Body() transitionRollDto: TransitionRollDto,
  ): Promise<Roll> {
    const roll = await this.rollService.transition(key, transitionRollDto);
    if (!roll) {
      throw new NotFoundException("Roll not found");
    }
    return roll;
  }
}
