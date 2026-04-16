import {
  BadRequestException,
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
import { FilmService } from "./application/film.service";
import { CreateFilmDto } from "./dto/create-film.dto";
import { UpdateFilmDto } from "./dto/update-film.dto";
import { AddTagDto } from "../shared/dto/add-tag.dto";
import { TransitionFilmDto } from "./dto/transition-film.dto";

@ApiTags("Films")
@Controller("films")
export class FilmController {
  constructor(private readonly filmService: FilmService) {}

  @Get()
  @ApiOperation({ summary: "List all films with optional filters" })
  @ApiQuery({
    name: "state",
    required: false,
    isArray: true,
    description: "Filter by current state name(s)",
  })
  @ApiQuery({
    name: "emulsionId",
    required: false,
    type: Number,
    description: "Filter by emulsion ID",
  })
  @ApiQuery({
    name: "formatId",
    required: false,
    type: Number,
    description: "Filter by format ID (via emulsion)",
  })
  @ApiQuery({
    name: "tagId",
    required: false,
    isArray: true,
    type: Number,
    description: "Filter by tag ID(s) — OR semantics",
  })
  @ApiQuery({
    name: "from",
    required: false,
    type: String,
    description: "Filter by loaded date — start (YYYY-MM-DD, inclusive)",
  })
  @ApiQuery({
    name: "to",
    required: false,
    type: String,
    description: "Filter by loaded date — end (YYYY-MM-DD, inclusive)",
  })
  @ApiQuery({
    name: "q",
    required: false,
    type: String,
    description:
      "Search by film name or state note (case-insensitive partial match)",
  })
  findAll(
    @Query("state") state?: string | string[],
    @Query("emulsionId") rawEmulsionId?: string,
    @Query("formatId") rawFormatId?: string,
    @Query("tagId") tagId?: string | string[],
    @Query("from") rawFrom?: string,
    @Query("to") rawTo?: string,
    @Query("q") rawQ?: string,
  ) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (rawFrom && !dateRegex.test(rawFrom)) {
      throw new BadRequestException(
        "from must be a valid date in YYYY-MM-DD format",
      );
    }
    if (rawTo && !dateRegex.test(rawTo)) {
      throw new BadRequestException(
        "to must be a valid date in YYYY-MM-DD format",
      );
    }

    const stateNames = state
      ? Array.isArray(state)
        ? state
        : [state]
      : undefined;
    const emulsionId =
      rawEmulsionId !== undefined ? parseInt(rawEmulsionId, 10) : undefined;
    const formatId =
      rawFormatId !== undefined ? parseInt(rawFormatId, 10) : undefined;
    const tagIds = tagId
      ? (Array.isArray(tagId) ? tagId : [tagId])
          .map((t) => parseInt(t, 10))
          .filter((n) => !isNaN(n))
      : undefined;
    return this.filmService.findAll({
      stateNames,
      emulsionId,
      formatId,
      tagIds,
      from: rawFrom,
      to: rawTo,
      q: rawQ,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a film by id" })
  findById(@Param("id", ParseIntPipe) id: number) {
    return this.filmService.findById(id);
  }

  @Get(":id/children")
  @ApiOperation({ summary: "List child films cut from a bulk canister" })
  findChildren(@Param("id", ParseIntPipe) id: number) {
    return this.filmService.findChildren(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a film" })
  create(@Body() dto: CreateFilmDto) {
    return this.filmService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a film" })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateFilmDto) {
    return this.filmService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a film" })
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.filmService.delete(id);
  }

  @Post(":id/tags")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Associate a tag with a film" })
  addTag(@Param("id", ParseIntPipe) id: number, @Body() dto: AddTagDto) {
    return this.filmService.addTag(id, dto.tagId);
  }

  @Delete(":id/tags/:tagId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a tag from a film" })
  removeTag(
    @Param("id", ParseIntPipe) id: number,
    @Param("tagId", ParseIntPipe) tagId: number,
  ) {
    return this.filmService.removeTag(id, tagId);
  }

  @Post(":id/transition")
  @ApiOperation({ summary: "Transition a film to a new state" })
  transition(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: TransitionFilmDto,
  ) {
    return this.filmService.transition(id, dto);
  }
}
