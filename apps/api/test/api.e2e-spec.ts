import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MikroORM } from '@mikro-orm/core';
import {
  developmentProcessSchema,
  deviceLoadTimelineEventSchema,
  emulsionSchema,
  filmDetailSchema,
  filmLotDetailSchema,
  filmJourneyEventSchema,
  filmFrameSchema,
  filmFormatSchema,
  filmDeviceSchema,
  filmSupplierSchema,
  holderTypeSchema,
  packageTypeSchema,
  deviceTypeSchema,
  storageLocationSchema,
  tokenPairSchema
} from '@frollz2/schema';
import { UserEntity } from '../src/infrastructure/entities/user.entity.js';
import { createTestHarness, destroyTestHarness, type TestHarness } from './test-harness.js';

describe('API integration', () => {
  let harness: TestHarness;

  beforeAll(async () => {
    harness = await createTestHarness();
  });

  afterAll(async () => {
    await destroyTestHarness(harness);
  });

  async function registerUser(email: string) {
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'password123', name: 'Demo User' }
    });

    expect(response.statusCode).toBe(201);
    return tokenPairSchema.parse(response.json());
  }

  async function refreshToken(refreshToken: string) {
    return harness.app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken }
    });
  }

  async function loadCoreReferenceData(authHeaders: Record<string, string>) {
    const emulsionResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/emulsions', headers: authHeaders });
    const emulsions = emulsionSchema.array().parse(emulsionResponse.json());

    const formatResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/film-formats', headers: authHeaders });
    const filmFormats = filmFormatSchema.array().parse(formatResponse.json());

    const packageTypesResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/package-types', headers: authHeaders });
    const packageTypes = packageTypeSchema.array().parse(packageTypesResponse.json());
    const developmentProcessesResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/development-processes', headers: authHeaders });
    const developmentProcesses = developmentProcessSchema.array().parse(developmentProcessesResponse.json());

    const deviceTypesResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/device-types', headers: authHeaders });
    const deviceTypes = deviceTypeSchema.array().parse(deviceTypesResponse.json());

    const holderTypesResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/holder-types', headers: authHeaders });
    const holderTypes = holderTypeSchema.array().parse(holderTypesResponse.json());

    const storageLocationsResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/storage-locations', headers: authHeaders });
    const storageLocations = storageLocationSchema.array().parse(storageLocationsResponse.json());

    return {
      filmFormat: filmFormats.find((item) => item.code === '35mm')!,
      emulsion: emulsions.find((item) => item.brand === 'Gold')!,
      packageType: packageTypes.find((item) => item.code === '24exp' && item.filmFormat.code === '35mm')!,
      developmentProcess: developmentProcesses.find((item) => item.code.toLowerCase() === 'c41')!,
      deviceType: deviceTypes.find((item) => item.code === 'film_holder')!,
      cameraType: deviceTypes.find((item) => item.code === 'camera')!,
      holderType: holderTypes.find((item) => item.code === 'standard')!,
      freezer: storageLocations.find((item) => item.code === 'freezer')!,
      refrigerator: storageLocations.find((item) => item.code === 'refrigerator')!
    };
  }

  async function createFilmForUser(authHeaders: Record<string, string>, name: string) {
    const refs = await loadCoreReferenceData(authHeaders);
    const createResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film/lots',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        emulsionId: refs.emulsion.id,
        packageTypeId: refs.packageType.id,
        filmFormatId: refs.filmFormat.id,
        quantity: 1,
        films: [{ name }],
        expirationDate: null
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const lot = filmLotDetailSchema.parse(createResponse.json());
    return {
      refs,
      film: lot.films[0]!
    };
  }

  async function getFirstAvailableFilmFrameId(authHeaders: Record<string, string>, filmId: number) {
    const response = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/film/${filmId}/frames`,
      headers: authHeaders
    });
    expect(response.statusCode).toBe(200);
    const frames = filmFrameSchema.array().parse(response.json());
    return frames[0]?.id ?? 1;
  }

  it('registers, logs in, and returns a token pair', async () => {
    const email = `demo-${Date.now()}@example.com`;
    const tokenPair = await registerUser(email);
    expect(tokenPair.accessToken).toBeTruthy();
    expect(tokenPair.refreshToken).toBeTruthy();

    const loginResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' }
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(tokenPairSchema.parse(loginResponse.json())).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String) });
  });

  it('treats duplicate register submissions as one successful registration', async () => {
    const email = `register-race-${Date.now()}@example.com`;
    const payload = { email, password: 'password123', name: 'Demo User' };

    const [firstResponse, secondResponse] = await Promise.all([
      harness.app.inject({ method: 'POST', url: '/api/v1/auth/register', payload }),
      harness.app.inject({ method: 'POST', url: '/api/v1/auth/register', payload })
    ]);

    expect(firstResponse.statusCode).toBe(201);
    expect(secondResponse.statusCode).toBe(201);
    expect(tokenPairSchema.parse(firstResponse.json())).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String)
    });
    expect(tokenPairSchema.parse(secondResponse.json())).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String)
    });

    const userCount = await harness.app.get(MikroORM).em.fork().count(UserEntity, { email });
    expect(userCount).toBe(1);
  });

  it('rotates refresh tokens and tolerates immediate duplicate refresh submissions', async () => {
    const email = `refresh-race-${Date.now()}@example.com`;
    const initialTokens = await registerUser(email);

    const firstRefreshResponse = await refreshToken(initialTokens.refreshToken);
    expect(firstRefreshResponse.statusCode).toBe(200);
    const firstRefreshTokens = tokenPairSchema.parse(firstRefreshResponse.json());
    expect(firstRefreshTokens.refreshToken).not.toBe(initialTokens.refreshToken);

    const duplicateRefreshResponse = await refreshToken(initialTokens.refreshToken);
    expect(duplicateRefreshResponse.statusCode).toBe(200);
    const duplicateRefreshTokens = tokenPairSchema.parse(duplicateRefreshResponse.json());
    expect(duplicateRefreshTokens.refreshToken).not.toBe(initialTokens.refreshToken);
  });

  it('revokes the session when an old refresh token is replayed after the grace window', async () => {
    const email = `refresh-replay-${Date.now()}@example.com`;
    const initialTokens = await registerUser(email);

    const refreshResponse = await refreshToken(initialTokens.refreshToken);
    expect(refreshResponse.statusCode).toBe(200);
    const rotatedTokens = tokenPairSchema.parse(refreshResponse.json());

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const replayResponse = await refreshToken(initialTokens.refreshToken);
    expect(replayResponse.statusCode).toBe(401);
    expect(replayResponse.json()).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Refresh token reuse detected'
      }
    });

    const revokedSessionRefreshResponse = await refreshToken(rotatedTokens.refreshToken);
    expect(revokedSessionRefreshResponse.statusCode).toBe(401);
  });

  it('rejects unauthenticated access to film endpoints', async () => {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/film'
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects unauthenticated access to reference endpoints', async () => {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/emulsions'
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects film creation when package type format does not match film format', async () => {
    const email = `mismatch-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };

    const refs = await loadCoreReferenceData(authHeaders);
    const nonMatchingFormatResponse = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/reference/film-formats',
      headers: authHeaders
    });
    const filmFormats = filmFormatSchema.array().parse(nonMatchingFormatResponse.json());
    const otherFormat = filmFormats.find((entry) => entry.code !== refs.filmFormat.code)!;

    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film/lots',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        emulsionId: refs.emulsion.id,
        packageTypeId: refs.packageType.id,
        filmFormatId: otherFormat.id,
        quantity: 1,
        films: [{ name: 'Broken combo' }],
        expirationDate: null
      }
    });

    expect(response.statusCode).toBe(422);
  });

  it('supports the full film journey and holder slot transitions', async () => {
    const email = `journey-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };

    const referenceResponse = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/emulsions',
      headers: authHeaders
    });
    const emulsions = emulsionSchema.array().parse(referenceResponse.json());

    const formatResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/film-formats', headers: authHeaders });
    const filmFormats = filmFormatSchema.array().parse(formatResponse.json());

    const packageTypesResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/package-types', headers: authHeaders });
    const packageTypes = packageTypeSchema.array().parse(packageTypesResponse.json());

    const deviceTypesResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/device-types', headers: authHeaders });
    const deviceTypes = deviceTypeSchema.array().parse(deviceTypesResponse.json());

    const holderTypesResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/holder-types', headers: authHeaders });
    const holderTypes = holderTypeSchema.array().parse(holderTypesResponse.json());

    const storageLocationsResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/storage-locations', headers: authHeaders });
    const storageLocations = storageLocationSchema.array().parse(storageLocationsResponse.json());

    const filmFormat = filmFormats.find((item) => item.code === '35mm');
    const emulsion = emulsions.find((item) => item.brand === 'Gold');
    const packageType = packageTypes.find((item) => item.code === '24exp' && item.filmFormat.code === '35mm');
    const deviceType = deviceTypes.find((item) => item.code === 'film_holder');
    const holderType = holderTypes.find((item) => item.code === 'standard');
    const freezer = storageLocations.find((item) => item.code === 'freezer');
    const refrigerator = storageLocations.find((item) => item.code === 'refrigerator');

    expect(filmFormat).toBeTruthy();
    expect(emulsion).toBeTruthy();
    expect(packageType).toBeTruthy();
    expect(deviceType).toBeTruthy();
    expect(holderType).toBeTruthy();
    expect(freezer).toBeTruthy();
    expect(refrigerator).toBeTruthy();

    const filmCreateResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film/lots',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        emulsionId: emulsion!.id,
        packageTypeId: packageType!.id,
        filmFormatId: filmFormat!.id,
        quantity: 1,
        films: [{ name: 'Delta roll' }],
        expirationDate: null
      }
    });

    expect(filmCreateResponse.statusCode).toBe(201);
    const createdLot = filmLotDetailSchema.parse(filmCreateResponse.json());
    const createdFilm = createdLot.films[0]!;
    expect(createdFilm.currentStateCode).toBe('purchased');

    const initialEventsResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: authHeaders
    });
    const initialEvents = filmJourneyEventSchema.array().parse(initialEventsResponse.json());
    expect(initialEvents).toHaveLength(1);
    expect(initialEvents[0]?.filmStateCode).toBe('purchased');

    const storageEventResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'stored',
        occurredAt: new Date().toISOString(),
        notes: 'Into freezer',
        eventData: {
          storageLocationId: freezer!.id,
          storageLocationCode: freezer!.code
        }
      }
    });
    expect(storageEventResponse.statusCode).toBe(201);

    const secondStorageEventResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'stored',
        occurredAt: new Date().toISOString(),
        notes: 'Moved to refrigerator',
        eventData: {
          storageLocationId: refrigerator!.id,
          storageLocationCode: refrigerator!.code
        }
      }
    });
    expect(secondStorageEventResponse.statusCode).toBe(201);

    const deviceCreateResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        deviceTypeCode: 'film_holder',
        deviceTypeId: deviceType!.id,
        filmFormatId: filmFormat!.id,
        frameSize: 'full_frame',
        name: 'Hasselblad A12',
        brand: 'Hasselblad',
        holderTypeId: holderType!.id
      }
    });

    expect(deviceCreateResponse.statusCode).toBe(201);
    const device = filmDeviceSchema.parse(deviceCreateResponse.json());
    expect(device.deviceTypeCode).toBe('film_holder');
    const createdFilmUnitId = await getFirstAvailableFilmFrameId(authHeaders, createdFilm.id);

    const loadedEventResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'loaded',
        occurredAt: new Date().toISOString(),
        notes: 'Loaded into holder',
        eventData: {
          loadTargetType: 'film_holder_slot',
          filmUnitId: createdFilmUnitId,
          filmHolderId: device.id,
          slotNumber: 1,
          intendedPushPull: null
        }
      }
    });
    expect(loadedEventResponse.statusCode).toBe(201);

    const deviceAfterLoadedResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/devices/${device.id}`,
      headers: authHeaders
    });
    const deviceAfterLoaded = filmDeviceSchema.parse(deviceAfterLoadedResponse.json());
    if (deviceAfterLoaded.deviceTypeCode === 'film_holder') {
      expect(deviceAfterLoaded.slots.at(-1)?.slotStateCode).toBe('loaded');
    }

    const exposedEventResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'exposed',
        occurredAt: new Date().toISOString(),
        eventData: {}
      }
    });
    expect(exposedEventResponse.statusCode).toBe(201);

    const deviceAfterExposedResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/devices/${device.id}`,
      headers: authHeaders
    });
    const deviceAfterExposed = filmDeviceSchema.parse(deviceAfterExposedResponse.json());
    if (deviceAfterExposed.deviceTypeCode === 'film_holder') {
      expect(deviceAfterExposed.slots.at(-1)?.slotStateCode).toBe('exposed');
    }

    const removedEventResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'removed',
        occurredAt: new Date().toISOString(),
        eventData: {}
      }
    });
    expect(removedEventResponse.statusCode).toBe(201);

    const deviceAfterRemovedResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/devices/${device.id}`,
      headers: authHeaders
    });
    const deviceAfterRemoved = filmDeviceSchema.parse(deviceAfterRemovedResponse.json());
    if (deviceAfterRemoved.deviceTypeCode === 'film_holder') {
      expect(deviceAfterRemoved.slots.at(-1)?.slotStateCode).toBe('removed');
    }

    const labResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film-labs',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: { name: 'Local Lab' }
    });
    expect(labResponse.statusCode).toBe(201);
    const lab = labResponse.json();

    const sentForDevResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'sent_for_dev',
        occurredAt: new Date().toISOString(),
        eventData: {
          labId: lab.id,
          actualPushPull: null
        }
      }
    });
    expect(sentForDevResponse.statusCode).toBe(201);

    const developedResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'developed',
        occurredAt: new Date().toISOString(),
        eventData: {
          labId: lab.id,
          actualPushPull: null
        }
      }
    });
    expect(developedResponse.statusCode).toBe(201);

    const scannedResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'scanned',
        occurredAt: new Date().toISOString(),
        eventData: {
          scannerOrSoftware: 'SilverFast',
          scanLink: null
        }
      }
    });
    expect(scannedResponse.statusCode).toBe(201);

    const archivedResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'archived',
        occurredAt: new Date().toISOString(),
        eventData: {}
      }
    });
    expect(archivedResponse.statusCode).toBe(201);

    const finalFilmResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/film/${createdFilm.id}`,
      headers: authHeaders
    });

    const finalFilm = filmDetailSchema.parse(finalFilmResponse.json());
    expect(finalFilm.currentStateCode).toBe('archived');

    const eventsResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: authHeaders
    });
    const allEvents = filmJourneyEventSchema.array().parse(eventsResponse.json());
    expect(allEvents).toHaveLength(10);
    expect(allEvents.at(-1)?.filmStateCode).toBe('archived');

    const deviceDetailResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/devices/${device.id}`,
      headers: authHeaders
    });
    const finalDevice = filmDeviceSchema.parse(deviceDetailResponse.json());
    expect(finalDevice.deviceTypeCode).toBe('film_holder');
    if (finalDevice.deviceTypeCode === 'film_holder') {
      expect(finalDevice.slots[0]?.slotStateCode).toBe('removed');
    }
  });

  it('returns 409 when loading into an already occupied holder slot', async () => {
    const email = `occupied-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };

    const refs = await loadCoreReferenceData(authHeaders);
    const deviceCreateResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        deviceTypeCode: 'film_holder',
        deviceTypeId: refs.deviceType.id,
        filmFormatId: refs.filmFormat.id,
        frameSize: 'full_frame',
        name: 'A12',
        brand: 'Hasselblad',
        holderTypeId: refs.holderType.id
      }
    });
    const device = filmDeviceSchema.parse(deviceCreateResponse.json());

    const firstFilm = await createFilmForUser(authHeaders, 'First slot film');
    const firstFilmUnitId = await getFirstAvailableFilmFrameId(authHeaders, firstFilm.film.id);
    await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${firstFilm.film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'stored',
        occurredAt: new Date().toISOString(),
        eventData: {
          storageLocationId: refs.freezer.id,
          storageLocationCode: refs.freezer.code
        }
      }
    });

    await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${firstFilm.film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'loaded',
        occurredAt: new Date().toISOString(),
        eventData: {
          loadTargetType: 'film_holder_slot',
          filmUnitId: firstFilmUnitId,
          filmHolderId: device.id,
          slotNumber: 1,
          intendedPushPull: null
        }
      }
    });

    const secondFilm = await createFilmForUser(authHeaders, 'Second slot film');
    const secondFilmUnitId = await getFirstAvailableFilmFrameId(authHeaders, secondFilm.film.id);
    await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${secondFilm.film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'stored',
        occurredAt: new Date().toISOString(),
        eventData: {
          storageLocationId: refs.refrigerator.id,
          storageLocationCode: refs.refrigerator.code
        }
      }
    });

    const conflictResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${secondFilm.film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'loaded',
        occurredAt: new Date().toISOString(),
        eventData: {
          loadTargetType: 'film_holder_slot',
          filmUnitId: secondFilmUnitId,
          filmHolderId: device.id,
          slotNumber: 1,
          intendedPushPull: null
        }
      }
    });

    expect(conflictResponse.statusCode).toBe(409);
  });

  it('allows exposed after a backdated loaded event', async () => {
    const email = `backdated-loaded-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const refs = await loadCoreReferenceData(authHeaders);

    const deviceCreateResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        deviceTypeCode: 'film_holder',
        deviceTypeId: refs.deviceType.id,
        filmFormatId: refs.filmFormat.id,
        frameSize: 'full_frame',
        name: 'Backdated Test Holder',
        brand: 'Hasselblad',
        holderTypeId: refs.holderType.id
      }
    });
    expect(deviceCreateResponse.statusCode).toBe(201);
    const device = filmDeviceSchema.parse(deviceCreateResponse.json());

    const createdFilm = await createFilmForUser(authHeaders, 'Backdated loaded film');
    const filmUnitId = await getFirstAvailableFilmFrameId(authHeaders, createdFilm.film.id);
    const now = new Date();

    const storedResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'stored',
        occurredAt: now.toISOString(),
        eventData: {
          storageLocationId: refs.refrigerator.id,
          storageLocationCode: refs.refrigerator.code
        }
      }
    });
    expect(storedResponse.statusCode).toBe(201);

    const loadedOccurredAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const loadedResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'loaded',
        occurredAt: loadedOccurredAt,
        eventData: {
          loadTargetType: 'film_holder_slot',
          filmUnitId,
          filmHolderId: device.id,
          slotNumber: 1,
          intendedPushPull: null
        }
      }
    });
    expect(loadedResponse.statusCode).toBe(201);

    const exposedResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'exposed',
        occurredAt: now.toISOString(),
        eventData: {}
      }
    });

    expect(exposedResponse.statusCode).toBe(201);
    const exposedEvent = filmJourneyEventSchema.parse(exposedResponse.json());
    expect(exposedEvent.filmStateCode).toBe('exposed');
  });

  it('replays create device responses for the same idempotency key without duplicating rows', async () => {
    const email = `idempotent-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const refs = await loadCoreReferenceData(authHeaders);
    const idempotencyKey = `devices-create-${Date.now()}`;

    const payload = {
      deviceTypeCode: 'camera' as const,
      deviceTypeId: refs.cameraType.id,
      filmFormatId: refs.filmFormat.id,
      frameSize: 'half_frame',
      make: 'Minolta',
      model: 'X-700',
      serialNumber: null,
      dateAcquired: null
    };

    const first = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      payload
    });
    expect(first.statusCode).toBe(201);
    const firstDevice = filmDeviceSchema.parse(first.json());

    const second = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      payload
    });
    expect(second.statusCode).toBe(201);
    const secondDevice = filmDeviceSchema.parse(second.json());

    expect(secondDevice.id).toBe(firstDevice.id);

    const all = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/devices',
      headers: authHeaders
    });
    expect(all.statusCode).toBe(200);
    const devices = filmDeviceSchema.array().parse(all.json());
    const matching = devices.filter(
      (device) =>
        device.deviceTypeCode === 'camera' &&
        device.frameSize === payload.frameSize &&
        ('make' in device && device.make === payload.make) &&
        ('model' in device && device.model === payload.model)
    );
    expect(matching).toHaveLength(1);
  });

  it('returns 409 when an idempotency key is reused with a different create device payload', async () => {
    const email = `idempotent-conflict-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const refs = await loadCoreReferenceData(authHeaders);
    const idempotencyKey = `devices-create-conflict-${Date.now()}`;

    const first = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      payload: {
        deviceTypeCode: 'camera',
        deviceTypeId: refs.cameraType.id,
        filmFormatId: refs.filmFormat.id,
        frameSize: 'half_frame',
        make: 'Minolta',
        model: 'X-700',
        serialNumber: null,
        dateAcquired: null
      }
    });
    expect(first.statusCode).toBe(201);

    const second = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      payload: {
        deviceTypeCode: 'camera',
        deviceTypeId: refs.cameraType.id,
        filmFormatId: refs.filmFormat.id,
        frameSize: 'half_frame',
        make: 'Minolta',
        model: 'X-701',
        serialNumber: null,
        dateAcquired: null
      }
    });
    expect(second.statusCode).toBe(409);
  });

  it('creates an emulsion and returns it from the reference endpoint', async () => {
    const email = `emulsion-create-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const refs = await loadCoreReferenceData(authHeaders);

    const createResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/emulsions',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        manufacturer: 'Kodak',
        brand: `Test Stock ${Date.now()}`,
        isoSpeed: 200,
        developmentProcessId: refs.developmentProcess.id,
        filmFormatIds: [refs.filmFormat.id]
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const created = emulsionSchema.parse(createResponse.json());
    expect(created.manufacturer).toBe('Kodak');
    expect(created.isoSpeed).toBe(200);
    expect(created.developmentProcess.id).toBe(refs.developmentProcess.id);
    expect(created.filmFormats.some((format) => format.id === refs.filmFormat.id)).toBe(true);
  });

  it('replays create emulsion responses for the same idempotency key without duplicating rows', async () => {
    const email = `emulsion-idempotent-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const refs = await loadCoreReferenceData(authHeaders);
    const idempotencyKey = `emulsions-create-${Date.now()}`;

    const payload = {
      manufacturer: 'Kodak',
      brand: `Replay Stock ${Date.now()}`,
      isoSpeed: 320,
      developmentProcessId: refs.developmentProcess.id,
      filmFormatIds: [refs.filmFormat.id]
    };

    const first = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/emulsions',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      payload
    });
    expect(first.statusCode).toBe(201);
    const firstEmulsion = emulsionSchema.parse(first.json());

    const second = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/emulsions',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      payload
    });
    expect(second.statusCode).toBe(201);
    const secondEmulsion = emulsionSchema.parse(second.json());
    expect(secondEmulsion.id).toBe(firstEmulsion.id);

    const list = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/emulsions',
      headers: authHeaders
    });
    expect(list.statusCode).toBe(200);
    const emulsions = emulsionSchema.array().parse(list.json());
    const matching = emulsions.filter(
      (item) =>
        item.manufacturer === payload.manufacturer &&
        item.brand === payload.brand &&
        item.isoSpeed === payload.isoSpeed
    );
    expect(matching).toHaveLength(1);
  });

  it('returns 409 when an idempotency key is reused with a different create emulsion payload', async () => {
    const email = `emulsion-idempotent-conflict-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const refs = await loadCoreReferenceData(authHeaders);
    const idempotencyKey = `emulsions-create-conflict-${Date.now()}`;

    const first = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/emulsions',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      payload: {
        manufacturer: 'Ilford',
        brand: `Conflict Stock A ${Date.now()}`,
        isoSpeed: 100,
        developmentProcessId: refs.developmentProcess.id,
        filmFormatIds: [refs.filmFormat.id]
      }
    });
    expect(first.statusCode).toBe(201);

    const second = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/emulsions',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      payload: {
        manufacturer: 'Ilford',
        brand: `Conflict Stock B ${Date.now()}`,
        isoSpeed: 400,
        developmentProcessId: refs.developmentProcess.id,
        filmFormatIds: [refs.filmFormat.id]
      }
    });
    expect(second.statusCode).toBe(409);
  });

  it('returns 422 for backwards and invalid skip transitions', async () => {
    const email = `transitions-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const { refs, film } = await createFilmForUser(authHeaders, 'Transition test film');

    const invalidSkip = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'developed',
        occurredAt: new Date().toISOString(),
        eventData: {
          labName: 'Test Lab',
          actualPushPull: null
        }
      }
    });

    expect(invalidSkip.statusCode).toBe(422);

    const cameraCreateResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        deviceTypeCode: 'camera',
        deviceTypeId: refs.cameraType.id,
        filmFormatId: refs.filmFormat.id,
        frameSize: 'full_frame',
        make: 'Nikon',
        model: 'F3',
        serialNumber: null,
        dateAcquired: null
      }
    });
    const camera = filmDeviceSchema.parse(cameraCreateResponse.json());
    const filmUnitId = await getFirstAvailableFilmFrameId(authHeaders, film.id);

    const stored = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'stored',
        occurredAt: new Date().toISOString(),
        eventData: {
          storageLocationId: refs.freezer.id,
          storageLocationCode: refs.freezer.code
        }
      }
    });
    expect(stored.statusCode).toBe(201);

    const loaded = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'loaded',
        occurredAt: new Date().toISOString(),
        eventData: {
          loadTargetType: 'camera_direct',
          filmUnitId,
          cameraId: camera.id,
          intendedPushPull: null
        }
      }
    });
    expect(loaded.statusCode).toBe(201);

    const backwards = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'stored',
        occurredAt: new Date().toISOString(),
        eventData: {
          storageLocationId: refs.refrigerator.id,
          storageLocationCode: refs.refrigerator.code
        }
      }
    });

    expect(backwards.statusCode).toBe(422);
  });

  it('returns 409 when deleting a device that still has a loaded film', async () => {
    const email = `device-delete-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const { refs, film } = await createFilmForUser(authHeaders, 'Delete conflict film');

    const cameraCreateResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        deviceTypeCode: 'camera',
        deviceTypeId: refs.cameraType.id,
        filmFormatId: refs.filmFormat.id,
        frameSize: 'full_frame',
        make: 'Canon',
        model: 'AE-1',
        serialNumber: null,
        dateAcquired: null
      }
    });
    const camera = filmDeviceSchema.parse(cameraCreateResponse.json());
    const filmUnitId = await getFirstAvailableFilmFrameId(authHeaders, film.id);

    await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'stored',
        occurredAt: new Date().toISOString(),
        eventData: {
          storageLocationId: refs.freezer.id,
          storageLocationCode: refs.freezer.code
        }
      }
    });

    await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${film.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'loaded',
        occurredAt: new Date().toISOString(),
        eventData: {
          loadTargetType: 'camera_direct',
          filmUnitId,
          cameraId: camera.id,
          intendedPushPull: null
        }
      }
    });

    const deleteResponse = await harness.app.inject({
      method: 'DELETE',
      url: `/api/v1/devices/${camera.id}`,
      headers: authHeaders
    });

    expect(deleteResponse.statusCode).toBe(409);
  });

  it('lists device load events in newest-first order with holder side and user isolation', async () => {
    const ownerTokens = await registerUser(`device-load-owner-${Date.now()}@example.com`);
    const otherTokens = await registerUser(`device-load-other-${Date.now()}@example.com`);
    const ownerHeaders = { authorization: `Bearer ${ownerTokens.accessToken}` };
    const otherHeaders = { authorization: `Bearer ${otherTokens.accessToken}` };
    const refs = await loadCoreReferenceData(ownerHeaders);

    const holderCreateResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { ...ownerHeaders, 'content-type': 'application/json' },
      payload: {
        deviceTypeCode: 'film_holder',
        deviceTypeId: refs.deviceType.id,
        filmFormatId: refs.filmFormat.id,
        frameSize: 'full_frame',
        name: 'A12',
        brand: 'Hasselblad',
        holderTypeId: refs.holderType.id
      }
    });
    const holder = filmDeviceSchema.parse(holderCreateResponse.json());

    const cameraCreateResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { ...ownerHeaders, 'content-type': 'application/json' },
      payload: {
        deviceTypeCode: 'camera',
        deviceTypeId: refs.cameraType.id,
        filmFormatId: refs.filmFormat.id,
        frameSize: 'full_frame',
        make: 'Nikon',
        model: 'F3',
        serialNumber: null,
        dateAcquired: null
      }
    });
    const camera = filmDeviceSchema.parse(cameraCreateResponse.json());

    const holderFilm = await createFilmForUser(ownerHeaders, 'Holder timeline roll');
    const holderFilmUnitId = await getFirstAvailableFilmFrameId(ownerHeaders, holderFilm.film.id);
    await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${holderFilm.film.id}/events`,
      headers: { ...ownerHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'stored',
        occurredAt: '2026-01-02T10:00:00.000Z',
        eventData: {
          storageLocationId: refs.freezer.id,
          storageLocationCode: refs.freezer.code
        }
      }
    });
    await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${holderFilm.film.id}/events`,
      headers: { ...ownerHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'loaded',
        occurredAt: '2026-01-02T12:00:00.000Z',
        eventData: {
          loadTargetType: 'film_holder_slot',
          filmUnitId: holderFilmUnitId,
          filmHolderId: holder.id,
          slotNumber: 2,
          intendedPushPull: null
        }
      }
    });

    const cameraFilm = await createFilmForUser(ownerHeaders, 'Camera timeline roll');
    const cameraFilmUnitId = await getFirstAvailableFilmFrameId(ownerHeaders, cameraFilm.film.id);
    const cameraLoadedResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${cameraFilm.film.id}/events`,
      headers: { ...ownerHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'stored',
        occurredAt: '2030-01-02T13:00:00.000Z',
        eventData: {
          storageLocationId: refs.refrigerator.id,
          storageLocationCode: refs.refrigerator.code
        }
      }
    });
    expect(cameraLoadedResponse.statusCode).toBe(201);
    await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${cameraFilm.film.id}/events`,
      headers: { ...ownerHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'loaded',
        occurredAt: '2030-01-02T14:00:00.000Z',
        eventData: {
          loadTargetType: 'camera_direct',
          filmUnitId: cameraFilmUnitId,
          cameraId: camera.id,
          intendedPushPull: null
        }
      }
    });
    const cameraExposedResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${cameraFilm.film.id}/events`,
      headers: { ...ownerHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'exposed',
        occurredAt: '2030-01-02T14:30:00.000Z',
        eventData: {}
      }
    });
    expect(cameraExposedResponse.statusCode).toBe(201);
    const cameraRemovedResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${cameraFilm.film.id}/events`,
      headers: { ...ownerHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'removed',
        occurredAt: '2030-01-02T14:45:00.000Z',
        eventData: {}
      }
    });
    expect(cameraRemovedResponse.statusCode).toBe(201);

    const newerHolderFilm = await createFilmForUser(ownerHeaders, 'Holder timeline newest');
    const newerHolderFilmUnitId = await getFirstAvailableFilmFrameId(ownerHeaders, newerHolderFilm.film.id);
    await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${newerHolderFilm.film.id}/events`,
      headers: { ...ownerHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'stored',
        occurredAt: '2026-01-02T15:00:00.000Z',
        eventData: {
          storageLocationId: refs.freezer.id,
          storageLocationCode: refs.freezer.code
        }
      }
    });
    await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${newerHolderFilm.film.id}/events`,
      headers: { ...ownerHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'loaded',
        occurredAt: '2026-01-02T16:00:00.000Z',
        eventData: {
          loadTargetType: 'film_holder_slot',
          filmUnitId: newerHolderFilmUnitId,
          filmHolderId: holder.id,
          slotNumber: 1,
          intendedPushPull: null
        }
      }
    });

    const holderEventsResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/devices/${holder.id}/load-events`,
      headers: ownerHeaders
    });

    expect(holderEventsResponse.statusCode).toBe(200);
    const holderEvents = deviceLoadTimelineEventSchema.array().parse(holderEventsResponse.json());
    expect(holderEvents).toHaveLength(2);
    expect(holderEvents.map((event) => event.filmName)).toEqual(['Holder timeline newest', 'Holder timeline roll']);
    expect(holderEvents[0]?.stockLabel).toBe('24 exposures');
    expect(holderEvents[0]?.removedAt).toBeNull();
    expect(holderEvents[0]?.slotSideNumber).toBe(1);
    expect(holderEvents[1]?.removedAt).toBeNull();
    expect(holderEvents[1]?.slotSideNumber).toBe(2);

    const cameraEventsResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/devices/${camera.id}/load-events`,
      headers: ownerHeaders
    });
    expect(cameraEventsResponse.statusCode).toBe(200);
    const cameraEvents = deviceLoadTimelineEventSchema.array().parse(cameraEventsResponse.json());
    expect(cameraEvents).toHaveLength(1);
    expect(cameraEvents[0]?.filmName).toBe('Camera timeline roll');
    expect(cameraEvents[0]?.stockLabel).toBe('24 exposures');
    expect(cameraEvents[0]?.removedAt).toBe('2030-01-02T14:45:00.000Z');
    expect(cameraEvents[0]?.slotSideNumber).toBeNull();

    const forbiddenResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/devices/${holder.id}/load-events`,
      headers: otherHeaders
    });
    expect(forbiddenResponse.statusCode).toBe(404);
  });

  it('returns 404 when one user requests another user film', async () => {
    const first = await registerUser(`owner-${Date.now()}@example.com`);
    const second = await registerUser(`intruder-${Date.now()}@example.com`);

    const authHeaders = { authorization: `Bearer ${first.accessToken}` };
    const emulsionResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/emulsions', headers: authHeaders });
    const emulsions = emulsionSchema.array().parse(emulsionResponse.json());
    const formatResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/film-formats', headers: authHeaders });
    const filmFormats = filmFormatSchema.array().parse(formatResponse.json());
    const packageTypesResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/package-types', headers: authHeaders });
    const packageTypes = packageTypeSchema.array().parse(packageTypesResponse.json());

    const filmFormat = filmFormats.find((item) => item.code === '35mm');
    const emulsion = emulsions.find((item) => item.brand === 'Gold');
    const packageType = packageTypes.find((item) => item.code === '24exp' && item.filmFormat.code === '35mm');

    const createResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film/lots',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        emulsionId: emulsion!.id,
        packageTypeId: packageType!.id,
        filmFormatId: filmFormat!.id,
        quantity: 1,
        films: [{ name: 'Private roll' }],
        expirationDate: null
      }
    });

    const createdLot = filmLotDetailSchema.parse(createResponse.json());
    const createdFilm = createdLot.films[0]!;

    const response = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/film/${createdFilm.id}`,
      headers: { authorization: `Bearer ${second.accessToken}` }
    });

    expect(response.statusCode).toBe(404);
  });

  it('updates and deletes an emulsion via /emulsions', async () => {
    const email = `emulsion-mutate-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const refs = await loadCoreReferenceData(authHeaders);

    const createResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/emulsions',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        manufacturer: 'BDD',
        brand: `Mutable ${Date.now()}`,
        isoSpeed: 250,
        developmentProcessId: refs.developmentProcess.id,
        filmFormatIds: [refs.filmFormat.id]
      }
    });
    expect(createResponse.statusCode).toBe(201);
    const created = emulsionSchema.parse(createResponse.json());

    const updateResponse = await harness.app.inject({
      method: 'PATCH',
      url: `/api/v1/emulsions/${created.id}`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        manufacturer: 'BDD',
        brand: 'Mutated',
        isoSpeed: 400,
        developmentProcessId: refs.developmentProcess.id,
        filmFormatIds: [refs.filmFormat.id]
      }
    });
    expect(updateResponse.statusCode).toBe(200);
    const updated = emulsionSchema.parse(updateResponse.json());
    expect(updated.brand).toBe('Mutated');
    expect(updated.isoSpeed).toBe(400);

    const deleteResponse = await harness.app.inject({
      method: 'DELETE',
      url: `/api/v1/emulsions/${created.id}`,
      headers: authHeaders
    });
    expect(deleteResponse.statusCode).toBe(204);
  });

  it('returns 409 when deleting an emulsion used by films', async () => {
    const email = `emulsion-conflict-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };

    const { refs } = await createFilmForUser(authHeaders, `Uses emulsion ${Date.now()}`);
    const response = await harness.app.inject({
      method: 'DELETE',
      url: `/api/v1/emulsions/${refs.emulsion.id}`,
      headers: authHeaders
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: 'CONFLICT'
      }
    });
  });

  it('manages film supplier lifecycle (create, list, get, update, archive, restore)', async () => {
    const email = `supplier-lifecycle-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };

    const createResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film-suppliers',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': `supplier-create-${Date.now()}` },
      payload: { name: 'Adorama', contact: 'Support Team', email: 'support@adorama.com', rating: 4 }
    });
    expect(createResponse.statusCode).toBe(201);
    const created = filmSupplierSchema.parse(createResponse.json());
    expect(created.name).toBe('Adorama');
    expect(created.rating).toBe(4);
    expect(created.active).toBe(true);

    const getResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/film-suppliers/${created.id}`,
      headers: authHeaders
    });
    expect(getResponse.statusCode).toBe(200);
    filmSupplierSchema.parse(getResponse.json());

    const listResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/film-suppliers', headers: authHeaders });
    expect(listResponse.statusCode).toBe(200);
    const activeSuppliers = filmSupplierSchema.array().parse(listResponse.json());
    expect(activeSuppliers.some((s) => s.id === created.id)).toBe(true);
    expect(activeSuppliers.every((s) => s.active)).toBe(true);

    const updateResponse = await harness.app.inject({
      method: 'PATCH',
      url: `/api/v1/film-suppliers/${created.id}`,
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': `supplier-update-${Date.now()}` },
      payload: { name: 'Adorama Pro', rating: 5 }
    });
    expect(updateResponse.statusCode).toBe(200);
    const updated = filmSupplierSchema.parse(updateResponse.json());
    expect(updated.name).toBe('Adorama Pro');
    expect(updated.rating).toBe(5);

    const archiveResponse = await harness.app.inject({
      method: 'PATCH',
      url: `/api/v1/film-suppliers/${created.id}`,
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': `supplier-archive-${Date.now()}` },
      payload: { active: false }
    });
    expect(archiveResponse.statusCode).toBe(200);
    expect(filmSupplierSchema.parse(archiveResponse.json()).active).toBe(false);

    const activeOnlyList = await harness.app.inject({ method: 'GET', url: '/api/v1/film-suppliers', headers: authHeaders });
    const activeOnly = filmSupplierSchema.array().parse(activeOnlyList.json());
    expect(activeOnly.some((s) => s.id === created.id)).toBe(false);

    const allList = await harness.app.inject({ method: 'GET', url: '/api/v1/film-suppliers?includeInactive=true', headers: authHeaders });
    const all = filmSupplierSchema.array().parse(allList.json());
    expect(all.some((s) => s.id === created.id && !s.active)).toBe(true);

    const restoreResponse = await harness.app.inject({
      method: 'PATCH',
      url: `/api/v1/film-suppliers/${created.id}`,
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': `supplier-restore-${Date.now()}` },
      payload: { active: true }
    });
    expect(restoreResponse.statusCode).toBe(200);
    expect(filmSupplierSchema.parse(restoreResponse.json()).active).toBe(true);
  });

  it('returns 409 when creating a film supplier with a duplicate name', async () => {
    const email = `supplier-dup-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const name = `Duplicate Lab ${Date.now()}`;

    const first = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film-suppliers',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': `supplier-dup-a-${Date.now()}` },
      payload: { name }
    });
    expect(first.statusCode).toBe(201);

    const second = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film-suppliers',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': `supplier-dup-b-${Date.now()}` },
      payload: { name }
    });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({ error: { code: 'CONFLICT' } });
  });

  it('isolates film suppliers between users', async () => {
    const emailA = `supplier-iso-a-${Date.now()}@example.com`;
    const emailB = `supplier-iso-b-${Date.now()}@example.com`;
    const tokensA = await registerUser(emailA);
    const tokensB = await registerUser(emailB);
    const headersA = { authorization: `Bearer ${tokensA.accessToken}` };
    const headersB = { authorization: `Bearer ${tokensB.accessToken}` };

    const createResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film-suppliers',
      headers: { ...headersA, 'content-type': 'application/json', 'idempotency-key': `supplier-iso-${Date.now()}` },
      payload: { name: 'User A Supplier' }
    });
    expect(createResponse.statusCode).toBe(201);
    const created = filmSupplierSchema.parse(createResponse.json());

    const getResponse = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/film-suppliers/${created.id}`,
      headers: headersB
    });
    expect(getResponse.statusCode).toBe(404);

    const listResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/film-suppliers', headers: headersB });
    const otherSuppliers = filmSupplierSchema.array().parse(listResponse.json());
    expect(otherSuppliers.some((s) => s.id === created.id)).toBe(false);
  });

  it('replays create supplier responses for the same idempotency key without duplicating rows', async () => {
    const email = `supplier-idempotent-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const key = `supplier-idem-${Date.now()}`;
    const payload = { name: `Replay Supplier ${Date.now()}`, rating: 3 };

    const first = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film-suppliers',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': key },
      payload
    });
    expect(first.statusCode).toBe(201);
    const firstSupplier = filmSupplierSchema.parse(first.json());

    const second = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film-suppliers',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': key },
      payload
    });
    expect(second.statusCode).toBe(201);
    expect(filmSupplierSchema.parse(second.json()).id).toBe(firstSupplier.id);

    const list = await harness.app.inject({ method: 'GET', url: '/api/v1/film-suppliers', headers: authHeaders });
    const suppliers = filmSupplierSchema.array().parse(list.json());
    expect(suppliers.filter((s) => s.name === payload.name)).toHaveLength(1);
  });

  it('returns 409 when a supplier idempotency key is reused with a different payload', async () => {
    const email = `supplier-idem-conflict-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const key = `supplier-idem-conflict-${Date.now()}`;

    const first = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film-suppliers',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': key },
      payload: { name: `Conflict Supplier A ${Date.now()}` }
    });
    expect(first.statusCode).toBe(201);

    const second = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film-suppliers',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': key },
      payload: { name: `Conflict Supplier B ${Date.now()}` }
    });
    expect(second.statusCode).toBe(409);
  });

  it('resolves supplier by supplierId when creating a film lot', async () => {
    const email = `supplier-lot-id-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const refs = await loadCoreReferenceData(authHeaders);

    const supplierResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film-suppliers',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': `supplier-lot-id-${Date.now()}` },
      payload: { name: 'B&H Photo' }
    });
    expect(supplierResponse.statusCode).toBe(201);
    const supplier = filmSupplierSchema.parse(supplierResponse.json());

    const lotResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film/lots',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        emulsionId: refs.emulsion.id,
        packageTypeId: refs.packageType.id,
        filmFormatId: refs.filmFormat.id,
        quantity: 1,
        films: [{ name: 'Supplier ID Lot' }],
        expirationDate: null,
        supplierId: supplier.id
      }
    });
    expect(lotResponse.statusCode).toBe(201);
    const lot = filmLotDetailSchema.parse(lotResponse.json());
    expect(lot.supplierId).toBe(supplier.id);
  });

  it('auto-creates supplier by name when creating a film lot with an unknown supplier name', async () => {
    const email = `supplier-lot-name-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const refs = await loadCoreReferenceData(authHeaders);
    const supplierName = `Auto Supplier ${Date.now()}`;

    const lotResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film/lots',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        emulsionId: refs.emulsion.id,
        packageTypeId: refs.packageType.id,
        filmFormatId: refs.filmFormat.id,
        quantity: 1,
        films: [{ name: 'Auto Supplier Lot' }],
        expirationDate: null,
        supplierName
      }
    });
    expect(lotResponse.statusCode).toBe(201);
    const lot = filmLotDetailSchema.parse(lotResponse.json());
    expect(lot.supplierId).not.toBeNull();

    const supplierList = await harness.app.inject({ method: 'GET', url: '/api/v1/film-suppliers', headers: authHeaders });
    const suppliers = filmSupplierSchema.array().parse(supplierList.json());
    expect(suppliers.some((s) => s.name === supplierName)).toBe(true);
  });

  it('reuses an existing supplier when creating a film lot with a known supplier name', async () => {
    const email = `supplier-lot-reuse-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const refs = await loadCoreReferenceData(authHeaders);
    const supplierName = `Reuse Supplier ${Date.now()}`;

    const supplierResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film-suppliers',
      headers: { ...authHeaders, 'content-type': 'application/json', 'idempotency-key': `supplier-lot-reuse-${Date.now()}` },
      payload: { name: supplierName }
    });
    expect(supplierResponse.statusCode).toBe(201);
    const existing = filmSupplierSchema.parse(supplierResponse.json());

    const lotResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film/lots',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        emulsionId: refs.emulsion.id,
        packageTypeId: refs.packageType.id,
        filmFormatId: refs.filmFormat.id,
        quantity: 1,
        films: [{ name: 'Reuse Supplier Lot' }],
        expirationDate: null,
        supplierName
      }
    });
    expect(lotResponse.statusCode).toBe(201);
    const lot = filmLotDetailSchema.parse(lotResponse.json());
    expect(lot.supplierId).toBe(existing.id);

    const supplierList = await harness.app.inject({ method: 'GET', url: '/api/v1/film-suppliers', headers: authHeaders });
    const suppliers = filmSupplierSchema.array().parse(supplierList.json());
    expect(suppliers.filter((s) => s.name === supplierName)).toHaveLength(1);
  });

  it('returns 404 when creating a film lot with a non-existent supplierId', async () => {
    const email = `supplier-lot-invalid-${Date.now()}@example.com`;
    const tokens = await registerUser(email);
    const authHeaders = { authorization: `Bearer ${tokens.accessToken}` };
    const refs = await loadCoreReferenceData(authHeaders);

    const lotResponse = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/film/lots',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        emulsionId: refs.emulsion.id,
        packageTypeId: refs.packageType.id,
        filmFormatId: refs.filmFormat.id,
        quantity: 1,
        films: [{ name: 'Bad Supplier Lot' }],
        expirationDate: null,
        supplierId: 999999
      }
    });
    expect(lotResponse.statusCode).toBe(404);
    expect(lotResponse.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});
