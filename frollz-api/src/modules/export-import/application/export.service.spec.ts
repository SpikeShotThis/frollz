import { randomInt } from 'crypto';
import { ExportService } from './export.service';
import { IFilmRepository } from '../../../domain/film/repositories/film.repository.interface';
import { Film } from '../../../domain/film/entities/film.entity';

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

describe('ExportService', () => {
  let service: ExportService;
  let filmRepo: jest.Mocked<IFilmRepository>;

  beforeEach(() => {
    filmRepo = makeFilmRepo() as jest.Mocked<IFilmRepository>;
    service = new ExportService(filmRepo);
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
});
