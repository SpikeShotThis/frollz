import { BadRequestException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { FilmsJsonImportService } from './films-json-import.service';
import { IFilmRepository } from '../../../domain/film/repositories/film.repository.interface';
import { IFilmStateRepository } from '../../../domain/film-state/repositories/film-state.repository.interface';
import { IFilmTagRepository } from '../../../domain/film-tag/repositories/film-tag.repository.interface';
import { IEmulsionRepository } from '../../../domain/emulsion/repositories/emulsion.repository.interface';
import { ITagRepository } from '../../../domain/shared/repositories/tag.repository.interface';
import { ITransitionStateRepository } from '../../../domain/transition/repositories/transition-state.repository.interface';
import { ITransitionProfileRepository } from '../../../domain/transition/repositories/transition-profile.repository.interface';
import { Emulsion } from '../../../domain/emulsion/entities/emulsion.entity';
import { Tag } from '../../../domain/shared/entities/tag.entity';
import { TransitionState } from '../../../domain/transition/entities/transition-state.entity';
import { TransitionProfile } from '../../../domain/transition/entities/transition-profile.entity';
import { INoteRepository } from '../../../domain/shared/repositories/note.repository.interface';

const randomId = () => randomInt(1, 1_000_000);

const makeEmulsion = (brand = 'Kodak Portra 400'): Emulsion =>
  Emulsion.create({ id: randomId(), brand, manufacturer: 'Kodak', speed: 400, processId: 1, formatId: 1 });

const makeTag = (name = 'landscape'): Tag =>
  Tag.create({ id: randomId(), name, colorCode: '#6B7280' });

const makeState = (name: string): TransitionState =>
  TransitionState.create({ id: randomId(), name });

const makeProfile = (name = 'standard'): TransitionProfile =>
  TransitionProfile.create({ id: randomId(), name });

const makeFilmRepo = (): IFilmRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findWithFilters: jest.fn().mockResolvedValue([]),
  findByEmulsionId: jest.fn().mockResolvedValue([]),
  findChildren: jest.fn().mockResolvedValue([]),
  findByCurrentStateIds: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

const makeFilmStateRepo = (): IFilmStateRepository => ({
  findById: jest.fn().mockResolvedValue(null),
  findByFilmId: jest.fn().mockResolvedValue([]),
  findLatestByFilmId: jest.fn().mockResolvedValue(null),
  findFilmIdsByCurrentState: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  saveMetadataValue: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

const makeFilmTagRepo = (): IFilmTagRepository => ({
  add: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
});

const makeEmulsionRepo = (emulsion: Emulsion | null = makeEmulsion()): IEmulsionRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByBrand: jest.fn().mockResolvedValue(emulsion),
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
});

const makeTagRepo = (tag: Tag | null = null): ITagRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(tag),
  findByName: jest.fn().mockResolvedValue(tag),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

const allStates = ['Added', 'Loaded', 'Exposed', 'Developed', 'Scanned', 'Imported'].map(makeState);

const makeTransitionStateRepo = (): ITransitionStateRepository => ({
  findAll: jest.fn().mockResolvedValue(allStates),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockImplementation((name: string) => Promise.resolve(allStates.find(s => s.name === name) ?? null)),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

const makeTransitionProfileRepo = (profile = makeProfile()): ITransitionProfileRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(profile),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

const makeNoteRepo = (): INoteRepository => ({
  findById: jest.fn().mockResolvedValue(null),
  findAll: jest.fn().mockResolvedValue([]),
  findByEntityId: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
});

const filmJson = (overrides: Record<string, unknown> = {}) => ({
  name: 'Roll 001',
  emulsion: { brand: 'Kodak Portra 400' },
  emulsionId: 1,
  expirationDate: '2026-12-31T00:00:00.000Z',
  parentId: null,
  transitionProfileId: 1,
  tags: [],
  states: [{ filmId: 1, stateId: 1, date: '2024-01-01T00:00:00.000Z', note: null, state: { id: 1, name: 'Loaded' } }],
  ...overrides,
});

const envelope = (films: unknown[]) =>
  Buffer.from(JSON.stringify({ version: 'v0.2.3', exportedAt: new Date().toISOString(), films }));

describe('FilmsJsonImportService', () => {
  let service: FilmsJsonImportService;
  let filmRepo: jest.Mocked<IFilmRepository>;
  let filmStateRepo: jest.Mocked<IFilmStateRepository>;
  let filmTagRepo: jest.Mocked<IFilmTagRepository>;
  let emulsionRepo: jest.Mocked<IEmulsionRepository>;
  let tagRepo: jest.Mocked<ITagRepository>;
  let transitionStateRepo: jest.Mocked<ITransitionStateRepository>;
  let transitionProfileRepo: jest.Mocked<ITransitionProfileRepository>;
  let noteRepo: jest.Mocked<INoteRepository>;

  beforeEach(() => {
    filmRepo = makeFilmRepo() as jest.Mocked<IFilmRepository>;
    filmStateRepo = makeFilmStateRepo() as jest.Mocked<IFilmStateRepository>;
    filmTagRepo = makeFilmTagRepo() as jest.Mocked<IFilmTagRepository>;
    emulsionRepo = makeEmulsionRepo() as jest.Mocked<IEmulsionRepository>;
    tagRepo = makeTagRepo() as jest.Mocked<ITagRepository>;
    transitionStateRepo = makeTransitionStateRepo() as jest.Mocked<ITransitionStateRepository>;
    transitionProfileRepo = makeTransitionProfileRepo() as jest.Mocked<ITransitionProfileRepository>;
    noteRepo = makeNoteRepo() as jest.Mocked<INoteRepository>;

    service = new FilmsJsonImportService(
      filmRepo, filmStateRepo, filmTagRepo,
      emulsionRepo, tagRepo,
      transitionStateRepo, transitionProfileRepo,
      noteRepo
    );
  });

  it('throws BadRequestException for invalid JSON', async () => {
    await expect(service.importFilmsJson(Buffer.from('not json'))).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when standard profile is not seeded', async () => {
    transitionProfileRepo.findByName = jest.fn().mockResolvedValue(null);
    await expect(service.importFilmsJson(envelope([filmJson()]))).rejects.toThrow(BadRequestException);
  });

  it('imports a valid film and saves it with its state history', async () => {
    const result = await service.importFilmsJson(envelope([filmJson()]));
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(filmRepo.save).toHaveBeenCalledTimes(1);
    expect(filmStateRepo.save).toHaveBeenCalledTimes(1);
  });

  it('preserves the original state date and note', async () => {

    const date = '2024-03-15T10:00:00.000Z';
    await service.importFilmsJson(envelope([
      filmJson({ states: [{ filmId: 1, stateId: 1, date, note: 'Shot in Portugal', state: { id: 1, name: 'Loaded' } }] }),
    ]));
    expect(filmStateRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ date: new Date(date) }),
    );

    expect(noteRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Shot in Portugal',
      entity_type: 'film_state',
      created_at: new Date(date),
    }));
  });

  it('reconstructs multiple states in chronological order', async () => {
    await service.importFilmsJson(envelope([
      filmJson({
        states: [
          { filmId: 1, stateId: 2, date: '2024-02-01T00:00:00.000Z', note: null, state: { id: 2, name: 'Exposed' } },
          { filmId: 1, stateId: 1, date: '2024-01-01T00:00:00.000Z', note: null, state: { id: 1, name: 'Loaded' } },
        ],
      }),
    ]));
    expect(filmStateRepo.save).toHaveBeenCalledTimes(2);
    const firstCall = (filmStateRepo.save as jest.Mock).mock.calls[0][0];
    const secondCall = (filmStateRepo.save as jest.Mock).mock.calls[1][0];
    expect(firstCall.date < secondCall.date).toBe(true);
  });

  it('skips a film with no state history', async () => {
    const result = await service.importFilmsJson(envelope([filmJson({ states: [] })]));
    expect(result.skipped).toBe(1);
    expect(result.errors[0].reason).toContain('no state history');
    expect(filmRepo.save).not.toHaveBeenCalled();
  });

  it('skips a film with no emulsion', async () => {
    const result = await service.importFilmsJson(envelope([filmJson({ emulsion: null })]));
    expect(result.skipped).toBe(1);
    expect(result.errors[0].reason).toContain('no emulsion');
  });

  it('skips a film with an unknown emulsion name', async () => {
    emulsionRepo.findByBrand = jest.fn().mockResolvedValue(null);
    const result = await service.importFilmsJson(envelope([filmJson()]));
    expect(result.skipped).toBe(1);
    expect(result.errors[0].reason).toContain('Unknown emulsion');
  });

  it('reconstructs tags on the film', async () => {
    const tag = makeTag('landscape');
    tagRepo.findByName = jest.fn().mockResolvedValue(tag);

    await service.importFilmsJson(envelope([
      filmJson({ tags: [{ name: 'landscape', colorCode: '#6B7280' }] }),
    ]));

    expect(filmTagRepo.add).toHaveBeenCalledWith(expect.any(Number), tag.id);
  });

  it('auto-creates tags not found on the target instance', async () => {
    const newTagId = randomId();
    const newTag = makeTag('nature');
    tagRepo.findByName = jest.fn().mockResolvedValue(null);
    tagRepo.save = jest.fn().mockResolvedValue(newTagId);
    tagRepo.findById = jest.fn().mockResolvedValue(newTag);

    await service.importFilmsJson(envelope([
      filmJson({ tags: [{ name: 'nature', colorCode: '#6B7280' }] }),
    ]));

    expect(tagRepo.save).toHaveBeenCalledWith(expect.objectContaining({ colorCode: '#6B7280' }));
    expect(filmTagRepo.add).toHaveBeenCalledTimes(1);
  });

  it('uses the expirationDate from the export when present', async () => {
    await service.importFilmsJson(envelope([filmJson({ expirationDate: '2027-06-30T00:00:00.000Z' })]));
    expect(filmRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ expirationDate: new Date('2027-06-30T00:00:00.000Z') }),
    );
  });

  it('continues processing remaining films after a skipped film', async () => {
    emulsionRepo.findByBrand = jest.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeEmulsion());

    const result = await service.importFilmsJson(envelope([filmJson(), filmJson({ name: 'Roll 002' })]));
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('ignores state records with unknown state names rather than failing the whole film', async () => {
    const result = await service.importFilmsJson(envelope([
      filmJson({
        states: [
          { filmId: 1, stateId: 99, date: '2024-01-01T00:00:00.000Z', note: null, state: { id: 99, name: 'UnknownState' } },
          { filmId: 1, stateId: 1, date: '2024-02-01T00:00:00.000Z', note: null, state: { id: 1, name: 'Loaded' } },
        ],
      }),
    ]));
    expect(result.imported).toBe(1);
    expect(filmStateRepo.save).toHaveBeenCalledTimes(1); // only the known state
  });
});
