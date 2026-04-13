import { randomInt } from 'crypto';
import { ExportService } from './export.service';
import { IFilmRepository } from '../../../domain/film/repositories/film.repository.interface';
import { Film } from '../../../domain/film/entities/film.entity';
import { IEmulsionRepository } from '../../../domain/emulsion/repositories/emulsion.repository.interface';
import { Emulsion } from '../../../domain/emulsion/entities/emulsion.entity';
import { IFormatRepository } from '../../../domain/shared/repositories/format.repository.interface';
import { Format } from '../../../domain/shared/entities/format.entity';
import { ITagRepository } from '../../../domain/shared/repositories/tag.repository.interface';
import { Tag } from '../../../domain/shared/entities/tag.entity';

const randomId = () => randomInt(1, 1_000_000);

const makeFilm = (overrides: Partial<Parameters<typeof Film.create>[0]> = {}): Film =>
  Film.create({
    id: randomId(),
    name: 'Roll 001',
    emulsionId: randomId(),
    expirationDate: new Date('2026-12-31'),
    parentId: null,
    transitionProfileId: randomId(),
    ...overrides,
  });

const makeFilmRepo = (overrides: Partial<IFilmRepository> = {}): IFilmRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findWithFilters: jest.fn().mockResolvedValue([]),
  findByEmulsionId: jest.fn().mockResolvedValue([]),
  findChildren: jest.fn().mockResolvedValue([]),
  findByCurrentStateIds: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeEmulsion = (overrides: Partial<Parameters<typeof Emulsion.create>[0]> = {}): Emulsion =>
  Emulsion.create({
    id: randomId(),
    name: 'Kodak Gold 200',
    brand: 'Kodak',
    manufacturer: 'Kodak',
    speed: 200,
    processId: randomId(),
    formatId: randomId(),
    ...overrides,
  });

const makeFormat = (overrides: Partial<Parameters<typeof Format.create>[0]> = {}): Format =>
  Format.create({
    id: randomId(),
    packageId: randomId(),
    name: '35mm',
    ...overrides,
  });

const makeTag = (overrides: Partial<Parameters<typeof Tag.create>[0]> = {}): Tag =>
  Tag.create({
    id: randomId(),
    name: 'Expired',
    colorCode: '#6B7280',
    ...overrides,
  });

const makeEmulsionRepo = (overrides: Partial<IEmulsionRepository> = {}): IEmulsionRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(null),
  findByProcessId: jest.fn().mockResolvedValue([]),
  findByFormatId: jest.fn().mockResolvedValue([]),
  findBrands: jest.fn().mockResolvedValue([]),
  findManufacturers: jest.fn().mockResolvedValue([]),
  findSpeeds: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  updateBoxImage: jest.fn().mockResolvedValue(undefined),
  getBoxImage: jest.fn().mockResolvedValue(null),
  ...overrides,
});

const makeFormatRepo = (overrides: Partial<IFormatRepository> = {}): IFormatRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByPackageId: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeTagRepo = (overrides: Partial<ITagRepository> = {}): ITagRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('ExportService', () => {
  let service: ExportService;
  let filmRepo: jest.Mocked<IFilmRepository>;
  let emulsionRepo: jest.Mocked<IEmulsionRepository>;
  let formatRepo: jest.Mocked<IFormatRepository>;
  let tagRepo: jest.Mocked<ITagRepository>;

  beforeEach(() => {
    filmRepo = makeFilmRepo() as jest.Mocked<IFilmRepository>;
    emulsionRepo = makeEmulsionRepo() as jest.Mocked<IEmulsionRepository>;
    formatRepo = makeFormatRepo() as jest.Mocked<IFormatRepository>;
    tagRepo = makeTagRepo() as jest.Mocked<ITagRepository>;
    service = new ExportService(filmRepo, emulsionRepo, formatRepo, tagRepo);
  });

  describe('exportFilmsJson', () => {
    it('returns an empty films array when no films exist', async () => {
      filmRepo.findAll = jest.fn().mockResolvedValue([]);
      const result = await service.exportFilmsJson();
      expect(result.films).toEqual([]);
    });

    it('returns all films from the repository', async () => {
      const films = [makeFilm({ name: 'Roll 001' }), makeFilm({ name: 'Roll 002' })];
      filmRepo.findAll = jest.fn().mockResolvedValue(films);
      const result = await service.exportFilmsJson();
      expect(result.films).toEqual(films);
      expect(filmRepo.findAll).toHaveBeenCalledTimes(1);
    });

    it('includes a version field from APP_VERSION env var', async () => {
      process.env.APP_VERSION = 'v1.2.3';
      filmRepo.findAll = jest.fn().mockResolvedValue([]);
      const result = await service.exportFilmsJson();
      expect(result.version).toBe('v1.2.3');
      delete process.env.APP_VERSION;
    });

    it('falls back to "unknown" when APP_VERSION is not set', async () => {
      delete process.env.APP_VERSION;
      filmRepo.findAll = jest.fn().mockResolvedValue([]);
      const result = await service.exportFilmsJson();
      expect(result.version).toBe('unknown');
    });

    it('includes an exportedAt ISO timestamp', async () => {
      filmRepo.findAll = jest.fn().mockResolvedValue([]);
      const before = new Date().toISOString();
      const result = await service.exportFilmsJson();
      const after = new Date().toISOString();
      expect(result.exportedAt >= before).toBe(true);
      expect(result.exportedAt <= after).toBe(true);
    });
  });

  describe('exportLibraryJson', () => {
    it('returns empty arrays when no data exists', async () => {
      const result = await service.exportLibraryJson();
      expect(result.emulsions).toEqual([]);
      expect(result.formats).toEqual([]);
      expect(result.tags).toEqual([]);
    });

    it('returns all emulsions, formats, and tags from their repositories', async () => {
      const emulsions = [makeEmulsion({ name: 'Kodak Gold 200' }), makeEmulsion({ name: 'Fuji Superia 400' })];
      const formats = [makeFormat({ name: '35mm' }), makeFormat({ name: '120' })];
      const tags = [makeTag({ name: 'Expired' }), makeTag({ name: 'Push +1' })];
      emulsionRepo.findAll = jest.fn().mockResolvedValue(emulsions);
      formatRepo.findAll = jest.fn().mockResolvedValue(formats);
      tagRepo.findAll = jest.fn().mockResolvedValue(tags);

      const result = await service.exportLibraryJson();

      expect(result.emulsions).toEqual(emulsions);
      expect(result.formats).toEqual(formats);
      expect(result.tags).toEqual(tags);
      expect(emulsionRepo.findAll).toHaveBeenCalledTimes(1);
      expect(formatRepo.findAll).toHaveBeenCalledTimes(1);
      expect(tagRepo.findAll).toHaveBeenCalledTimes(1);
    });

    it('includes a version field from APP_VERSION env var', async () => {
      process.env.APP_VERSION = 'v2.0.0';
      const result = await service.exportLibraryJson();
      expect(result.version).toBe('v2.0.0');
      delete process.env.APP_VERSION;
    });

    it('falls back to "unknown" when APP_VERSION is not set', async () => {
      delete process.env.APP_VERSION;
      const result = await service.exportLibraryJson();
      expect(result.version).toBe('unknown');
    });

    it('includes an exportedAt ISO timestamp', async () => {
      const before = new Date().toISOString();
      const result = await service.exportLibraryJson();
      const after = new Date().toISOString();
      expect(result.exportedAt >= before).toBe(true);
      expect(result.exportedAt <= after).toBe(true);
    });
  });
});
