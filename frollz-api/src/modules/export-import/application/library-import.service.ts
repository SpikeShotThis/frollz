import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Emulsion } from '../../../domain/emulsion/entities/emulsion.entity';
import { IEmulsionRepository, EMULSION_REPOSITORY } from '../../../domain/emulsion/repositories/emulsion.repository.interface';
import { Format } from '../../../domain/shared/entities/format.entity';
import { IFormatRepository, FORMAT_REPOSITORY } from '../../../domain/shared/repositories/format.repository.interface';
import { Tag } from '../../../domain/shared/entities/tag.entity';
import { ITagRepository, TAG_REPOSITORY } from '../../../domain/shared/repositories/tag.repository.interface';

export interface LibraryEntityResult {
  imported: number;
  skipped: number;
}

export interface LibraryImportError {
  entity: string;
  index: number;
  reason: string;
}

export interface LibraryImportResult {
  tags: LibraryEntityResult;
  formats: LibraryEntityResult;
  emulsions: LibraryEntityResult;
  errors: LibraryImportError[];
}

interface TagPayload { name: string; colorCode: string; description?: string | null }
interface FormatPayload { id: number; packageId: number; name: string }
interface EmulsionPayload { brand: string; manufacturer: string; speed: number; processId: number; formatId: number; name?: string }
interface LibraryEnvelope { version?: string; tags?: TagPayload[]; formats?: FormatPayload[]; emulsions?: EmulsionPayload[] }

@Injectable()
export class LibraryImportService {
  private readonly logger = new Logger(LibraryImportService.name);

  constructor(
    @Inject(EMULSION_REPOSITORY) private readonly emulsionRepo: IEmulsionRepository,
    @Inject(FORMAT_REPOSITORY) private readonly formatRepo: IFormatRepository,
    @Inject(TAG_REPOSITORY) private readonly tagRepo: ITagRepository,
  ) {}

  async importLibrary(buffer: Buffer): Promise<LibraryImportResult> {
    let envelope: LibraryEnvelope;
    try {
      envelope = JSON.parse(buffer.toString('utf-8')) as LibraryEnvelope;
    } catch {
      throw new BadRequestException('Invalid JSON — ensure the file is a valid library.json export');
    }

    const currentVersion = process.env.APP_VERSION ?? 'unknown';
    if (envelope.version && envelope.version !== currentVersion) {
      this.logger.warn(
        `Library import version mismatch: file is ${envelope.version}, server is ${currentVersion}`,
      );
    }

    const errors: LibraryImportError[] = [];
    const tagResult: LibraryEntityResult = { imported: 0, skipped: 0 };
    const formatResult: LibraryEntityResult = { imported: 0, skipped: 0 };
    const emulsionResult: LibraryEntityResult = { imported: 0, skipped: 0 };

    // --- Tags ---
    for (let i = 0; i < (envelope.tags ?? []).length; i++) {
      const t = envelope.tags![i];
      try {
        const existing = await this.tagRepo.findByName(t.name);
        if (existing) { tagResult.skipped++; continue; }
        await this.tagRepo.save(Tag.create({ name: t.name, colorCode: t.colorCode ?? '#6B7280', description: t.description ?? null }));
        tagResult.imported++;
      } catch {
        errors.push({ entity: 'tag', index: i + 1, reason: `Failed to import tag "${t.name}"` });
      }
    }

    // --- Formats (build sourceId → localId map for emulsion remapping) ---
    const formatIdMap = new Map<number, number>();
    for (let i = 0; i < (envelope.formats ?? []).length; i++) {
      const f = envelope.formats![i];
      try {
        const existing = await this.findFormatByPackageAndName(f.packageId, f.name);
        if (existing) {
          formatIdMap.set(f.id, existing.id);
          formatResult.skipped++;
          continue;
        }
        const newId = await this.formatRepo.save(Format.create({ packageId: f.packageId, name: f.name }));
        formatIdMap.set(f.id, newId);
        formatResult.imported++;
      } catch {
        errors.push({ entity: 'format', index: i + 1, reason: `Failed to import format "${f.name}"` });
      }
    }

    // --- Emulsions ---
    for (let i = 0; i < (envelope.emulsions ?? []).length; i++) {
      const e = envelope.emulsions![i];
      try {
        const existing = await this.emulsionRepo.findByBrand(e.brand);
        if (existing) { emulsionResult.skipped++; continue; }

        const localFormatId = formatIdMap.get(e.formatId) ?? e.formatId;
        await this.emulsionRepo.save(
          Emulsion.create({
            brand: e.brand,
            manufacturer: e.manufacturer,
            speed: e.speed,
            processId: e.processId,
            formatId: localFormatId,
            parentId: null, // skip parent remapping
          }),
        );
        emulsionResult.imported++;
      } catch {
        errors.push({ entity: 'emulsion', index: i + 1, reason: `Failed to import emulsion "${e.brand}"` });
      }
    }

    return { tags: tagResult, formats: formatResult, emulsions: emulsionResult, errors };
  }

  private async findFormatByPackageAndName(packageId: number, name: string): Promise<Format | null> {
    const formats = await this.formatRepo.findByPackageId(packageId);
    return formats.find((f) => f.name === name) ?? null;
  }
}
