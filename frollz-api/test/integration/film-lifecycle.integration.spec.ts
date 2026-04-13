/**
 * Integration tests — film lifecycle
 *
 * These tests run against a real in-memory SQLite database (better-sqlite3)
 * with all migrations applied.  No mocks.  Every assertion round-trips through
 * the actual Knex repositories and the application service layer.
 *
 * Coverage:
 *   - Emulsion creation (single format and multi-format)
 *   - Film creation
 *   - Tagging emulsions and films, verifying tag is readable back
 *   - Moving a film through the full standard lifecycle
 *     (Added → Shelved → Loaded → Finished → Sent For Development → Developed → Received)
 *   - Querying films by current state
 */

import { Knex } from 'knex';
import { createTestDb, seedSupporting, profileId, stateId } from './helpers/db';

import { EmulsionKnexRepository } from '../../src/infrastructure/persistence/emulsion/emulsion.knex.repository';
import { EmulsionTagKnexRepository } from '../../src/infrastructure/persistence/emulsion-tag/emulsion-tag.knex.repository';
import { FilmKnexRepository } from '../../src/infrastructure/persistence/film/film.knex.repository';
import { FilmTagKnexRepository } from '../../src/infrastructure/persistence/film-tag/film-tag.knex.repository';
import { FilmStateKnexRepository } from '../../src/infrastructure/persistence/film-state/film-state.knex.repository';
import { TransitionStateKnexRepository } from '../../src/infrastructure/persistence/transition/transition-state.knex.repository';
import { TransitionRuleKnexRepository } from '../../src/infrastructure/persistence/transition/transition-rule.knex.repository';
import { TransitionStateMetadataKnexRepository } from '../../src/infrastructure/persistence/transition/transition-state-metadata.knex.repository';
import { TransitionMetadataFieldKnexRepository } from '../../src/infrastructure/persistence/transition/transition-metadata-field.knex.repository';
import { TagKnexRepository } from '../../src/infrastructure/persistence/shared/tag.knex.repository';

import { EmulsionService } from '../../src/modules/emulsion/application/emulsion.service';
import { FilmService } from '../../src/modules/film/application/film.service';

// ---------------------------------------------------------------------------
// Shared DB + repos across all tests in this file
// ---------------------------------------------------------------------------

let knex: Knex;

let emulsionRepo: EmulsionKnexRepository;
let emulsionTagRepo: EmulsionTagKnexRepository;
let filmRepo: FilmKnexRepository;
let filmTagRepo: FilmTagKnexRepository;
let filmStateRepo: FilmStateKnexRepository;
let transitionStateRepo: TransitionStateKnexRepository;
let transitionRuleRepo: TransitionRuleKnexRepository;
let transitionStateMetadataRepo: TransitionStateMetadataKnexRepository;
let transitionMetadataFieldRepo: TransitionMetadataFieldKnexRepository;
let tagRepo: TagKnexRepository;

let emulsionService: EmulsionService;
let filmService: FilmService;

// Supporting ids seeded once before all tests
let processId: number;
let formatId: number;
let tagId: number;
let standardProfileId: number;

beforeAll(async () => {
  knex = await createTestDb();

  // Repositories — constructed directly; NestJS DI decorators are no-ops at runtime
  emulsionRepo = new EmulsionKnexRepository(knex);
  emulsionTagRepo = new EmulsionTagKnexRepository(knex);
  filmRepo = new FilmKnexRepository(knex);
  filmTagRepo = new FilmTagKnexRepository(knex);
  filmStateRepo = new FilmStateKnexRepository(knex);
  transitionStateRepo = new TransitionStateKnexRepository(knex);
  transitionRuleRepo = new TransitionRuleKnexRepository(knex);
  transitionStateMetadataRepo = new TransitionStateMetadataKnexRepository(knex);
  transitionMetadataFieldRepo = new TransitionMetadataFieldKnexRepository(knex);
  tagRepo = new TagKnexRepository(knex);

  // Services
  emulsionService = new EmulsionService(emulsionRepo, emulsionTagRepo);
  filmService = new FilmService(filmRepo, filmTagRepo, filmStateRepo, transitionStateRepo, transitionRuleRepo, transitionStateMetadataRepo, transitionMetadataFieldRepo);

  // Seed supporting data
  const seeds = await seedSupporting(knex);
  processId = seeds.processId;
  formatId = seeds.formatId;
  tagId = seeds.tagId;
  standardProfileId = await profileId(knex, 'standard');
});

afterAll(async () => {
  await knex.destroy();
});

// ---------------------------------------------------------------------------
// Emulsion
// ---------------------------------------------------------------------------

describe('Emulsion', () => {
  it('creates an emulsion and reads it back', async () => {
    const emulsion = await emulsionService.create({
      name: 'Portra 400',
      brand: 'Kodak',
      manufacturer: 'Kodak',
      speed: 400,
      processId,
      formatId,
    });

    expect(emulsion.id).toBeGreaterThan(0);
    expect(emulsion.name).toBe('Portra 400');
    expect(emulsion.brand).toBe('Kodak');
    expect(emulsion.speed).toBe(400);
    expect(emulsion.processId).toBe(processId);
    expect(emulsion.formatId).toBe(formatId);

    const fetched = await emulsionService.findById(emulsion.id);
    expect(fetched.name).toBe('Portra 400');
  });

  it('creates emulsions across multiple formats in one call', async () => {
    // Seed a second format
    const [format2Id] = await knex('format').insert({ name: '120', package_id: (await knex('package').first()).id });

    const emulsions = await emulsionService.createMultipleFormats({
      name: 'HP5 Plus',
      brand: 'Ilford',
      manufacturer: 'Ilford',
      speed: 400,
      processId,
      formatIds: [formatId, format2Id],
    });

    expect(emulsions).toHaveLength(2);
    const fmtIds = emulsions.map((e) => e.formatId).sort();
    expect(fmtIds).toEqual([formatId, format2Id].sort());
  });

  it('tags an emulsion and verifies the tag is returned', async () => {
    const emulsion = await emulsionService.create({
      name: 'Ektar 100',
      brand: 'Kodak',
      manufacturer: 'Kodak',
      speed: 100,
      processId,
      formatId,
    });

    await emulsionService.addTag(emulsion.id, tagId);

    const withTag = await emulsionService.findById(emulsion.id);
    expect(withTag.tags).toHaveLength(1);
    expect(withTag.tags[0].id).toBe(tagId);
    expect(withTag.tags[0].name).toBe('test-tag');
  });

  it('removes a tag from an emulsion', async () => {
    const emulsion = await emulsionService.create({
      name: 'Velvia 50',
      brand: 'Fujifilm',
      manufacturer: 'Fujifilm',
      speed: 50,
      processId,
      formatId,
    });

    await emulsionService.addTag(emulsion.id, tagId);
    await emulsionService.removeTag(emulsion.id, tagId);

    const withoutTag = await emulsionService.findById(emulsion.id);
    expect(withoutTag.tags).toHaveLength(0);
  });

  it('updates an emulsion field and persists the change', async () => {
    const emulsion = await emulsionService.create({
      name: 'Delta 400',
      brand: 'Ilford',
      manufacturer: 'Ilford',
      speed: 400,
      processId,
      formatId,
    });

    const updated = await emulsionService.update(emulsion.id, { speed: 800 });

    expect(updated.speed).toBe(800);
    const fetched = await emulsionService.findById(emulsion.id);
    expect(fetched.speed).toBe(800);
  });
});

// ---------------------------------------------------------------------------
// Film creation and tagging
// ---------------------------------------------------------------------------

describe('Film', () => {
  let emulsionId: number;

  beforeAll(async () => {
    const emulsion = await emulsionService.create({
      name: 'Portra 160',
      brand: 'Kodak',
      manufacturer: 'Kodak',
      speed: 160,
      processId,
      formatId,
    });
    emulsionId = emulsion.id;
  });

  it('creates a film and reads it back', async () => {
    const film = await filmService.create({
      name: 'Roll 001',
      emulsionId,
      expirationDate: '2028-12-31',
      transitionProfileId: standardProfileId,
    });

    expect(film.id).toBeGreaterThan(0);
    expect(film.name).toBe('Roll 001');
    expect(film.emulsionId).toBe(emulsionId);
    expect(film.transitionProfileId).toBe(standardProfileId);
    expect(film.states).toHaveLength(1);
    expect(film.currentState?.state?.name).toBe('Added');
    expect(film.emulsion).toBeDefined();
    expect(film.emulsion?.brand).toBe('Kodak');
    expect(film.emulsion?.speed).toBe(160);
  });

  it('tags a film and verifies the tag is returned', async () => {
    const film = await filmService.create({
      name: 'Roll 002',
      emulsionId,
      expirationDate: '2028-12-31',
      transitionProfileId: standardProfileId,
    });

    await filmService.addTag(film.id, tagId);

    const withTag = await filmService.findById(film.id);
    expect(withTag.tags).toHaveLength(1);
    expect(withTag.tags[0].id).toBe(tagId);
    expect(withTag.tags[0].name).toBe('test-tag');
  });

  it('removes a tag from a film', async () => {
    const film = await filmService.create({
      name: 'Roll 003',
      emulsionId,
      expirationDate: '2028-12-31',
      transitionProfileId: standardProfileId,
    });

    await filmService.addTag(film.id, tagId);
    await filmService.removeTag(film.id, tagId);

    const withoutTag = await filmService.findById(film.id);
    expect(withoutTag.tags).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Film lifecycle — full standard profile walk-through
// ---------------------------------------------------------------------------

describe('Film lifecycle (standard profile)', () => {
  let filmId: number;
  let emulsionId: number;

  // Use dates strictly in the future relative to when create() runs (which uses new Date()).
  // Without this, the auto-added 'Added' state would always sort as current because its
  // wall-clock date would exceed any hardcoded historical date passed to transition().
  const baseDate = new Date(Date.now() + 60_000); // 1 minute from now
  let transitionStep = 0;

  const nextDate = () =>
    new Date(baseDate.getTime() + transitionStep++ * 60_000).toISOString();

  beforeAll(async () => {
    const emulsion = await emulsionService.create({
      name: 'Tri-X 400',
      brand: 'Kodak',
      manufacturer: 'Kodak',
      speed: 400,
      processId,
      formatId,
    });
    emulsionId = emulsion.id;

    const film = await filmService.create({
      name: 'Lifecycle Roll',
      emulsionId,
      expirationDate: '2029-01-01',
      transitionProfileId: standardProfileId,
    });
    filmId = film.id;
  });

  const transitionAndAssert = async (targetStateName: string) => {
    const date = nextDate();
    const film = await filmService.transition(filmId, { targetStateName, date:  date });
    expect(film.currentState).not.toBeNull();
    expect(film.currentState!.state!.name).toBe(targetStateName);
    expect(film.currentState!.date.toISOString()).toBe(date);
    return film;
  };

  it('starts in Added state (set automatically by create)', async () => {
    const film = await filmService.findById(filmId);
    expect(film.states).toHaveLength(1);
    expect(film.currentState?.state?.name).toBe('Added');
  });

  it('transitions from Added to Shelved', async () => {
    await transitionAndAssert('Shelved');
  });

  it('transitions from Shelved to Loaded', async () => {
    await transitionAndAssert('Loaded');
  });

  it('transitions from Loaded to Finished', async () => {
    await transitionAndAssert('Finished');
  });

  it('transitions from Finished to Sent For Development', async () => {
    await transitionAndAssert('Sent For Development');
  });

  it('transitions from Sent For Development to Developed', async () => {
    await transitionAndAssert('Developed');
  });

  it('transitions from Developed to Received', async () => {
    const film = await transitionAndAssert('Received');
    // Full lifecycle complete — verify all 7 state entries were persisted
    expect(film.states).toHaveLength(7);
  });

  it('rejects a transition not allowed by the standard profile rules', async () => {
    // Roll is Received; jumping back to Loaded is not a valid standard rule
    await expect(filmService.transition(filmId, { targetStateName: 'Loaded' })).rejects.toThrow(
      'not permitted',
    );
  });
});

// ---------------------------------------------------------------------------
// findAll with state filter
// ---------------------------------------------------------------------------

describe('findAll with state filter', () => {
  let emulsionId: number;

  beforeAll(async () => {
    const emulsion = await emulsionService.create({
      name: 'HP5 400',
      brand: 'Ilford',
      manufacturer: 'Ilford',
      speed: 400,
      processId,
      formatId,
    });
    emulsionId = emulsion.id;
  });

  it('returns only films whose current state matches the filter', async () => {
    const filmA = await filmService.create({
      name: 'State Filter Roll A',
      emulsionId,
      expirationDate: '2029-01-01',
      transitionProfileId: standardProfileId,
    });
    const filmB = await filmService.create({
      name: 'State Filter Roll B',
      emulsionId,
      expirationDate: '2029-01-01',
      transitionProfileId: standardProfileId,
    });

    // Both films start in Added state automatically via create(); filmB progresses to Shelved.
    await filmService.transition(filmB.id, { targetStateName: 'Shelved' });

    const addedFilms = await filmService.findAll({ stateNames: ['Added'] });
    const addedIds = addedFilms.map((f) => f.id);

    expect(addedIds).toContain(filmA.id);
    expect(addedIds).not.toContain(filmB.id);
  });
});
