import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './application/export.service';

@ApiTags('Export')
@Controller('export')
export class ExportImportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('films.json')
  @ApiOperation({ summary: 'Export all films as JSON' })
  async exportFilmsJson(@Res() res: Response): Promise<void> {
    const envelope = await this.exportService.exportFilmsJson();
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="films-${date}.json"`);
    res.json(envelope);
  }
}
