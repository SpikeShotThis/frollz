import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

const transitionStates = [
  'Added',
  'Frozen',
  'Refrigerated',
  'Shelved',
  'Loaded',
  'Finished',
  'Sent For Development',
  'Developed',
  'Received',
];
const cameraStatuses = ['active', 'retired', 'in_repair'] as const;
const knownPackageIds = [1, 2, 3, 4];

function randomStateHistory(): Array<{ stateId: number; date: string; note?: string | null; state: { id: number; name: string } }> {
  const sequence = [] as Array<{ id: number; name: string }>;
  let currentIndex = 0;
  const finalIndex = faker.number.int({ min: 1, max: transitionStates.length - 1 });
  while (currentIndex <= finalIndex) {
    sequence.push({ id: currentIndex + 1, name: transitionStates[currentIndex] });
    const step = faker.number.int({ min: 1, max: 2 });
    currentIndex += step;
  }

  return sequence.map((state, index) => ({
    stateId: index + 1,
    date: new Date(Date.now() - (sequence.length - index) * 24 * 60 * 60 * 1000).toISOString(),
    note: faker.datatype.boolean() ? faker.lorem.sentence() : null,
    state,
  }));
}

function uniqueNames(count: number, generator: () => string) {
  const seen = new Set<string>();
  while (seen.size < count) {
    seen.add(generator());
  }
  return Array.from(seen);
}

function generateLibrary() {
  const tagNames = uniqueNames(5, () => faker.word.noun({ length: { min: 4, max: 10 } }));
  const tags = tagNames.map((name) => ({
    name,
    colorCode: faker.color.rgb({ prefix: '#' }),
    description: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
  }));

  const formats = Array.from({ length: 4 }, (_, index) => ({
    id: index + 1,
    packageId: faker.helpers.arrayElement(knownPackageIds),
    name: `${faker.word.adjective()} ${faker.word.noun()} ${faker.number.int({ min: 1, max: 100 })}`,
  }));

  const emulsionBrands = uniqueNames(5, () => faker.company.name());
  const emulsions = emulsionBrands.map((brand) => ({
    brand,
    manufacturer: faker.company.name(),
    speed: faker.number.int({ min: 10, max: 3200 }),
    processId: faker.helpers.arrayElement([1, 2, 3, 4]),
    formatId: faker.helpers.arrayElement(formats.map((format) => format.id)),
    name: faker.vehicle.type(),
  }));

  return {
    version: 'test',
    tags,
    formats,
    emulsions,
  };
}

function generateFilms(emulsions: Array<{ brand: string }>, tags: Array<{ name: string }>) {
  return Array.from({ length: 6 }, () => ({
    name: `${faker.word.adjective()} ${faker.word.noun()} ${faker.number.int({ min: 100, max: 999 })}`,
    emulsion: { brand: faker.helpers.arrayElement(emulsions).brand },
    expirationDate: faker.date.future({ years: 3 }).toISOString(),
    tags: faker.helpers.arrayElements(tags, faker.number.int({ min: 1, max: 3 })).map((tag) => ({ name: tag.name })),
    states: randomStateHistory(),
  }));
}

async function uploadJsonField(request: any, url: string, fieldName: string, object: unknown) {
  return request.post(url, {
    multipart: {
      [fieldName]: {
        name: 'data.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(object), 'utf-8'),
      },
    },
  });
}

test('random data import seeds library, films, and cameras with valid film state history', async ({ page, request }) => {
  const libraryPayload = generateLibrary();
  const libraryResponse = await uploadJsonField(request, '/api/import/library', 'library', libraryPayload);
  expect(libraryResponse.ok()).toBeTruthy();
  const libraryResult = await libraryResponse.json();
  expect(libraryResult.errors).toEqual([]);
  expect(libraryResult.tags.imported + libraryResult.tags.skipped).toBeGreaterThanOrEqual(libraryPayload.tags.length);
  expect(libraryResult.formats.imported + libraryResult.formats.skipped).toBeGreaterThanOrEqual(libraryPayload.formats.length);
  expect(libraryResult.emulsions.imported + libraryResult.emulsions.skipped).toBeGreaterThanOrEqual(libraryPayload.emulsions.length);

  const formatsResponse = await request.get('/api/formats');
  expect(formatsResponse.ok()).toBeTruthy();
  const formats = await formatsResponse.json();
  const supportedFormatIds = formats.slice(0, 3).map((format: any) => format.id).filter(Boolean);
  expect(supportedFormatIds.length).toBeGreaterThanOrEqual(1);

  const cameraNames = Array.from({ length: 3 }, () => `${faker.company.name()} ${faker.word.noun()}`);
  for (const name of cameraNames) {
    const createResponse = await request.post('/api/cameras', {
      data: {
        brand: faker.company.name(),
        model: name,
        status: faker.helpers.arrayElement(cameraStatuses),
        supportedFormatIds,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
  }

  const filmsPayload = generateFilms(libraryPayload.emulsions, libraryPayload.tags);
  const filmsEnvelope = { version: 'test', films: filmsPayload };
  const filmImportResponse = await request.post('/api/import/films/json', {
    multipart: {
      films: {
        name: 'films.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(filmsEnvelope), 'utf-8'),
      },
    },
  });

  expect(filmImportResponse.ok()).toBeTruthy();
  const filmImportResult = await filmImportResponse.json();
  expect(filmImportResult.errors).toEqual([]);
  expect(filmImportResult.imported).toBe(filmsPayload.length);

  const allFilmsResponse = await request.get('/api/films');
  expect(allFilmsResponse.ok()).toBeTruthy();
  const allFilms = await allFilmsResponse.json();
  for (const film of filmsPayload) {
    expect(allFilms.some((candidate: any) => candidate.name === film.name)).toBeTruthy();
  }

  await page.goto('/films');
  await expect(page.locator('table')).toContainText(filmsPayload[0].name);
  await expect(page.locator('table')).toContainText(filmsPayload[0].emulsion.brand);
});

test('film transition workflow records allowed state changes and state history', async ({ request }) => {
  const libraryPayload = generateLibrary();
  const libraryResponse = await uploadJsonField(request, '/api/import/library', 'library', libraryPayload);
  expect(libraryResponse.ok()).toBeTruthy();
  const libraryResult = await libraryResponse.json();
  expect(libraryResult.errors).toEqual([]);

  const emulsionsResponse = await request.get('/api/emulsions');
  expect(emulsionsResponse.ok()).toBeTruthy();
  const emulsions = await emulsionsResponse.json();
  expect(emulsions.length).toBeGreaterThanOrEqual(1);

  const profilesResponse = await request.get('/api/transitions/profiles');
  expect(profilesResponse.ok()).toBeTruthy();
  const profiles = await profilesResponse.json();
  const standardProfile = profiles.find((p: any) => p.name === 'standard');
  expect(standardProfile).toBeTruthy();

  const filmCreateResponse = await request.post('/api/films', {
    data: {
      name: `Transition Test ${faker.number.int({ min: 1000, max: 9999 })}`,
      emulsionId: emulsions[0].id,
      transitionProfileId: standardProfile.id,
    },
  });
  expect(filmCreateResponse.ok()).toBeTruthy();
  const film = await filmCreateResponse.json();

  const transitionNames = ['Frozen', 'Refrigerated', 'Shelved', 'Loaded'];
  for (const stateName of transitionNames) {
    const transitionResponse = await request.post(
      `/api/films/${film.id}/transition`,
      {
        data: {
          targetStateName: stateName,
          note: `Transition to ${stateName}`,
        },
      },
    );
    expect(transitionResponse.ok()).toBeTruthy();
    const transitioned = await transitionResponse.json();
    expect(transitioned.states[0].state.name).toBe(stateName);
  }

  const filmStatesResponse = await request.get(`/api/film-states?filmId=${film.id}`);
  expect(filmStatesResponse.ok()).toBeTruthy();
  const filmStates = await filmStatesResponse.json();
  expect(filmStates.map((state: any) => state.state.name).reverse()).toEqual([
    'Added',
    ...transitionNames,
  ]);
});
