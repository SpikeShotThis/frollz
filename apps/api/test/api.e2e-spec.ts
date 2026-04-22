import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  emulsionSchema,
  filmDetailSchema,
  filmJourneyEventSchema,
  filmFormatSchema,
  filmDeviceSchema,
  holderTypeSchema,
  packageTypeSchema,
  deviceTypeSchema,
  storageLocationSchema,
  tokenPairSchema
} from '../../../packages/schema/src/index.js';
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

  async function loadCoreReferenceData(authHeaders: Record<string, string>) {
    const emulsionResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/emulsions', headers: authHeaders });
    const emulsions = emulsionSchema.array().parse(emulsionResponse.json());

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

    return {
      filmFormat: filmFormats.find((item) => item.code === '35mm')!,
      emulsion: emulsions.find((item) => item.brand === 'Gold')!,
      packageType: packageTypes.find((item) => item.code === '24exp' && item.filmFormat.code === '35mm')!,
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
      url: '/api/v1/film',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        name,
        emulsionId: refs.emulsion.id,
        packageTypeId: refs.packageType.id,
        filmFormatId: refs.filmFormat.id,
        expirationDate: null
      }
    });

    expect(createResponse.statusCode).toBe(201);
    return {
      refs,
      film: filmDetailSchema.parse(createResponse.json())
    };
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
      url: '/api/v1/reference/emulsions'
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
      url: '/api/v1/film',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        name: 'Broken combo',
        emulsionId: refs.emulsion.id,
        packageTypeId: refs.packageType.id,
        filmFormatId: otherFormat.id,
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
      url: '/api/v1/reference/emulsions',
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
      url: '/api/v1/film',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        name: 'Delta roll',
        emulsionId: emulsion!.id,
        packageTypeId: packageType!.id,
        filmFormatId: filmFormat!.id,
        expirationDate: null
      }
    });

    expect(filmCreateResponse.statusCode).toBe(201);
    const createdFilm = filmDetailSchema.parse(filmCreateResponse.json());
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
        frameSize: '6x7',
        name: 'Hasselblad A12',
        brand: 'Hasselblad',
        holderTypeId: holderType!.id
      }
    });

    expect(deviceCreateResponse.statusCode).toBe(201);
    const device = filmDeviceSchema.parse(deviceCreateResponse.json());
    expect(device.deviceTypeCode).toBe('film_holder');

    const loadedEventResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'loaded',
        occurredAt: new Date().toISOString(),
        notes: 'Loaded into holder',
        eventData: {
          deviceId: device.id,
          slotSideNumber: 1,
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

    const sentForDevResponse = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/film/${createdFilm.id}/events`,
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        filmStateCode: 'sent_for_dev',
        occurredAt: new Date().toISOString(),
        eventData: {
          labName: 'Local Lab',
          labContact: null,
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
          labName: 'Local Lab',
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
        frameSize: '6x7',
        name: 'A12',
        brand: 'Hasselblad',
        holderTypeId: refs.holderType.id
      }
    });
    const device = filmDeviceSchema.parse(deviceCreateResponse.json());

    const firstFilm = await createFilmForUser(authHeaders, 'First slot film');
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
          deviceId: device.id,
          slotSideNumber: 1,
          intendedPushPull: null
        }
      }
    });

    const secondFilm = await createFilmForUser(authHeaders, 'Second slot film');
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
          deviceId: device.id,
          slotSideNumber: 1,
          intendedPushPull: null
        }
      }
    });

    expect(conflictResponse.statusCode).toBe(409);
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
      frameSize: 'Half Frame',
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
        frameSize: 'Half Frame',
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
        frameSize: 'Half Frame',
        make: 'Minolta',
        model: 'X-701',
        serialNumber: null,
        dateAcquired: null
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
        frameSize: '36x24',
        make: 'Nikon',
        model: 'F3',
        serialNumber: null,
        dateAcquired: null
      }
    });
    const camera = filmDeviceSchema.parse(cameraCreateResponse.json());

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
          deviceId: camera.id,
          slotSideNumber: null,
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
        frameSize: '36x24',
        make: 'Canon',
        model: 'AE-1',
        serialNumber: null,
        dateAcquired: null
      }
    });
    const camera = filmDeviceSchema.parse(cameraCreateResponse.json());

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
          deviceId: camera.id,
          slotSideNumber: null,
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

  it('returns 404 when one user requests another user film', async () => {
    const first = await registerUser(`owner-${Date.now()}@example.com`);
    const second = await registerUser(`intruder-${Date.now()}@example.com`);

    const authHeaders = { authorization: `Bearer ${first.accessToken}` };
    const emulsionResponse = await harness.app.inject({ method: 'GET', url: '/api/v1/reference/emulsions', headers: authHeaders });
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
      url: '/api/v1/film',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {
        name: 'Private roll',
        emulsionId: emulsion!.id,
        packageTypeId: packageType!.id,
        filmFormatId: filmFormat!.id,
        expirationDate: null
      }
    });

    const createdFilm = filmDetailSchema.parse(createResponse.json());

    const response = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/film/${createdFilm.id}`,
      headers: { authorization: `Bearer ${second.accessToken}` }
    });

    expect(response.statusCode).toBe(404);
  });
});
