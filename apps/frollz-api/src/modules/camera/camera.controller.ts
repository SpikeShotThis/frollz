import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CameraService } from "./application/camera.service";
import { CreateCameraDto } from "./dto/CreateCameraDto";
import { UpdateCameraDto } from "./dto/UpdateCameraDto";

@ApiTags("Camera")
@Controller("cameras")
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  @Get()
  @ApiOperation({ summary: "List all cameras with optional filters" })
  @ApiQuery({
    name: "brand",
    required: false,
    type: String,
    description: "Filter by brand",
  })
  @ApiQuery({
    name: "model",
    required: false,
    type: String,
    description: "Filter by model",
  })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "Filter by status (active, retired, in_repair)",
  })
  @ApiQuery({
    name: "formatId",
    required: false,
    type: Number,
    description: "Filter by accepted format ID",
  })
  @ApiQuery({
    name: "unloaded",
    required: false,
    type: Boolean,
    description: "Filter for cameras that are currently unloaded",
  })
  findAll(
    @Query("brand") brand?: string,
    @Query("model") model?: string,
    @Query("status") status?: "active" | "retired" | "in_repair",
    @Query("formatId", new ParseIntPipe({ optional: true })) formatId?: number,
    @Query("unloaded") unloaded?: boolean,
  ) {
    return this.cameraService.findAll({
      brand,
      model,
      status,
      formatId,
      unloaded,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a film by id" })
  findById(@Param("id", ParseIntPipe) id: number) {
    return this.cameraService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a camera" })
  create(@Body() dto: CreateCameraDto) {
    return this.cameraService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a camera" })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateCameraDto) {
    return this.cameraService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a camera" })
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.cameraService.delete(id);
  }
}
