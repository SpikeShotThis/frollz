import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { ExportService } from "./application/export.service";
import { ImportResult, ImportService } from "./application/import.service";
import {
  LibraryImportResult,
  LibraryImportService,
} from "./application/library-import.service";
import {
  FilmsJsonImportResult,
  FilmsJsonImportService,
} from "./application/films-json-import.service";

@ApiTags("Export / Import")
@Controller()
export class ExportImportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly importService: ImportService,
    private readonly libraryImportService: LibraryImportService,
    private readonly filmsJsonImportService: FilmsJsonImportService,
  ) {}

  @Get("export/films.json")
  @ApiOperation({ summary: "Export all films as JSON" })
  async exportFilmsJson(@Res() res: Response): Promise<void> {
    const envelope = await this.exportService.exportFilmsJson();
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="films-${date}.json"`,
    );
    res.json(envelope);
  }

  @Get("export/library.json")
  @ApiOperation({
    summary: "Export reference data (emulsions, formats, tags) as JSON",
  })
  async exportLibraryJson(@Res() res: Response): Promise<void> {
    const envelope = await this.exportService.exportLibraryJson();
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="library-${date}.json"`,
    );
    res.json(envelope);
  }

  @Get("import/films/template")
  @ApiOperation({ summary: "Download CSV template for film import" })
  getFilmsTemplate(@Res() res: Response): void {
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="films-import-template-${date}.csv"`,
    );
    res.send(this.importService.getTemplate());
  }

  @Post("import/films")
  @ApiOperation({ summary: "Import films from a CSV file" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { csv: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("csv"))
  async importFilms(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResult> {
    if (!file) throw new BadRequestException("No file uploaded");
    const allowed = new Set([
      "text/csv",
      "application/vnd.ms-excel",
      "text/plain",
    ]);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    return this.importService.importFilms(file.buffer);
  }

  @Post("import/library")
  @ApiOperation({
    summary:
      "Import reference data (tags, formats, emulsions) from a library.json export",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { library: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("library"))
  async importLibrary(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<LibraryImportResult> {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.libraryImportService.importLibrary(file.buffer);
  }

  @Post("import/films/json")
  @ApiOperation({
    summary: "Import films with full state history from a films.json export",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { films: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("films"))
  async importFilmsJson(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FilmsJsonImportResult> {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.filmsJsonImportService.importFilmsJson(file.buffer);
  }
}
