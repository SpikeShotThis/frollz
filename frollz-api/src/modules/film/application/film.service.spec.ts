import { randomInt } from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FilmService } from './film.service';
import { IFilmRepository } from '../../../domain/film/repositories/film.repository.interface';
import { IFilmTagRepository } from '../../../domain/film-tag/repositories/film-tag.repository.interface';
import { IFilmStateRepository } from '../../../domain/film-state/repositories/film-state.repository.interface';
import { ITransitionStateRepository } from '../../../domain/transition/repositories/transition-state.repository.interface';
import { ITransitionRuleRepository } from '../../../domain/transition/repositories/transition-rule.repository.interface';
import { Film } from '../../../domain/film/entities/film.entity';
import { FilmState } from '../../../domain/film-state/entities/film-state.entity';
import { TransitionState } from '../../../domain/transition/entities/transition-state.entity';
import { TransitionRule } from '../../../domain/transition/entities/transition-rule.entity';

const randomId = () => randomInt(1, 1000000);

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

const makeFilmState = (overrides: Partial<Parameters<typeof FilmState.create>[0]> = {}): FilmState =>
  FilmState.create({
    id: randomId(),
    filmId: randomId(),
    stateId: randomId(),
    date: new Date(),
    note: null,
    ...overrides,
  });

const makeTransitionState = (overrides: Partial<Parameters<typeof TransitionState.create>[0]> = {}): TransitionState =>
  TransitionState.create({ id: randomId(), name: 'Added', ...overrides });

const makeTransitionRule = (overrides: Partial<Parameters<typeof TransitionRule.create>[0]> = {}): TransitionRule =>
  TransitionRule.create({
    id: randomId(),
    fromStateId: randomId(),
    toStateId: randomId(),
    profileId: randomId(),
    ...overrides,
  });

const makeFilmRepo = (overrides: Partial<IFilmRepository> = {}): IFilmRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByEmulsionId: jest.fn().mockResolvedValue([]),
  findChildren: jest.fn().mockResolvedValue([]),
  findByCurrentStateIds: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeFilmTagRepo = (overrides: Partial<IFilmTagRepository> = {}): IFilmTagRepository => ({
  add: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeFilmStateRepo = (overrides: Partial<IFilmStateRepository> = {}): IFilmStateRepository => ({
  findById: jest.fn().mockResolvedValue(null),
  findByFilmId: jest.fn().mockResolvedValue([]),
  findLatestByFilmId: jest.fn().mockResolvedValue(null),
  findFilmIdsByCurrentState: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeStateRepo = (overrides: Partial<ITransitionStateRepository> = {}): ITransitionStateRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeRuleRepo = (overrides: Partial<ITransitionRuleRepository> = {}): ITransitionRuleRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByProfileId: jest.fn().mockResolvedValue([]),
  findByFromStateId: jest.fn().mockResolvedValue([]),
  findByFromStateAndProfile: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeService = (
  filmRepo: IFilmRepository = makeFilmRepo(),
  filmTagRepo: IFilmTagRepository = makeFilmTagRepo(),
  filmStateRepo: IFilmStateRepository = makeFilmStateRepo(),
  stateRepo: ITransitionStateRepository = makeStateRepo(),
  ruleRepo: ITransitionRuleRepository = makeRuleRepo(),
) => new FilmService(filmRepo, filmTagRepo, filmStateRepo, stateRepo, ruleRepo);

describe('FilmService', () => {
  describe('findAll', () => {
    it('returns all films when no state filter given', async () => {
      const film = makeFilm();
      const service = makeService(makeFilmRepo({ findAll: jest.fn().mockResolvedValue([film]) }));

      await expect(service.findAll()).resolves.toEqual([film]);
    });

    it('filters by state name, resolving names to ids', async () => {
      const addedState = makeTransitionState({ name: 'Added' });
      const film = makeFilm();
      const filmRepo = makeFilmRepo({ findByCurrentStateIds: jest.fn().mockResolvedValue([film]) });
      const stateRepo = makeStateRepo({ findAll: jest.fn().mockResolvedValue([addedState]) });
      const service = makeService(filmRepo, makeFilmTagRepo(), makeFilmStateRepo(), stateRepo);

      const result = await service.findAll(['Added']);

      expect(filmRepo.findByCurrentStateIds).toHaveBeenCalledWith([addedState.id]);
      expect(result).toEqual([film]);
    });

    it('returns empty array when state name does not match any known state', async () => {
      const service = makeService();

      await expect(service.findAll(['Unknown'])).resolves.toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns the film when found', async () => {
      const film = makeFilm();
      const service = makeService(makeFilmRepo({ findById: jest.fn().mockResolvedValue(film) }));

      await expect(service.findById(film.id)).resolves.toEqual(film);
    });

    it('throws NotFoundException when film does not exist', async () => {
      const service = makeService();

      await expect(service.findById(randomId())).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('saves and returns a new film with a generated uuid', async () => {
      const savedFilm = makeFilm({ name: 'Roll 001' });
      const filmRepo = makeFilmRepo({ findById: jest.fn().mockResolvedValue(savedFilm) });
      const service = makeService(filmRepo);

      const result = await service.create({
        name: 'Roll 001',
        emulsionId: randomId(),
        expirationDate: '2026-12-31',
        transitionProfileId: randomId(),
      });

      expect(result.name).toBe('Roll 001');
      expect(filmRepo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Roll 001' }));
    });
  });

  describe('addTag / removeTag', () => {
    it('adds a tag association to an existing film', async () => {
      const film = makeFilm();
      const tagId = randomId();
      const filmTagRepo = makeFilmTagRepo();
      const service = makeService(makeFilmRepo({ findById: jest.fn().mockResolvedValue(film) }), filmTagRepo);

      await service.addTag(film.id, tagId);

      expect(filmTagRepo.add).toHaveBeenCalledWith(film.id, tagId);
    });

    it('throws NotFoundException when film not found', async () => {
      const service = makeService();

      await expect(service.addTag(randomId(), randomId())).rejects.toThrow(NotFoundException);
    });
  });

  describe('transition', () => {
    it('records a new film state when the transition is valid', async () => {
      const addedStateId = randomId();
      const loadedState = makeTransitionState({ name: 'Loaded' });
      const existingFilmState = makeFilmState({ stateId: addedStateId });
      const film = makeFilm({ states: [existingFilmState] });
      const rule = makeTransitionRule({ fromStateId: addedStateId, toStateId: loadedState.id });

      const filmRepo = makeFilmRepo({
        findById: jest.fn().mockResolvedValue(film),
      });
      const filmStateRepo = makeFilmStateRepo();
      const stateRepo = makeStateRepo({ findByName: jest.fn().mockResolvedValue(loadedState) });
      const ruleRepo = makeRuleRepo({ findByFromStateAndProfile: jest.fn().mockResolvedValue([rule]) });
      const service = makeService(filmRepo, makeFilmTagRepo(), filmStateRepo, stateRepo, ruleRepo);

      await service.transition(film.id, { targetStateName: 'Loaded' });

      expect(filmStateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ filmId: film.id, stateId: loadedState.id }),
      );
    });

    it('throws NotFoundException when target state does not exist', async () => {
      const film = makeFilm();
      const service = makeService(makeFilmRepo({ findById: jest.fn().mockResolvedValue(film) }));

      await expect(service.transition(film.id, { targetStateName: 'Nonexistent' })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the transition is not permitted', async () => {
      const addedStateId = randomId();
      const receivedState = makeTransitionState({ name: 'Received' });
      const existingFilmState = makeFilmState({ stateId: addedStateId });
      const film = makeFilm({ states: [existingFilmState] });

      const filmRepo = makeFilmRepo({ findById: jest.fn().mockResolvedValue(film) });
      const stateRepo = makeStateRepo({ findByName: jest.fn().mockResolvedValue(receivedState) });
      const ruleRepo = makeRuleRepo({ findByFromStateAndProfile: jest.fn().mockResolvedValue([]) });
      const service = makeService(filmRepo, makeFilmTagRepo(), makeFilmStateRepo(), stateRepo, ruleRepo);

      await expect(service.transition(film.id, { targetStateName: 'Received' })).rejects.toThrow(BadRequestException);
    });

    it('allows transitioning a film with no prior state (initial transition)', async () => {
      const addedState = makeTransitionState({ name: 'Added' });
      const film = makeFilm({ states: [] });
      const filmRepo = makeFilmRepo({ findById: jest.fn().mockResolvedValue(film) });
      const filmStateRepo = makeFilmStateRepo();
      const stateRepo = makeStateRepo({ findByName: jest.fn().mockResolvedValue(addedState) });
      const service = makeService(filmRepo, makeFilmTagRepo(), filmStateRepo, stateRepo);

      await service.transition(film.id, { targetStateName: 'Added' });

      expect(filmStateRepo.save).toHaveBeenCalled();
    });
  });
});
