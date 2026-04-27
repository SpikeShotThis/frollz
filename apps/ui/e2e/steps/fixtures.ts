import { test as base } from 'playwright-bdd';
import { createBdd } from 'playwright-bdd';
import type {
  CreateFilmJourneyEventRequest,
  FilmFormat,
  PackageType,
  ReferenceTables,
  StorageLocation,
} from '@frollz2/schema';

export const API_URL = process.env['PLAYWRIGHT_API_URL'] ?? 'http://127.0.0.1:3001';
export const TEST_USER_EMAIL = process.env['PLAYWRIGHT_TEST_USER_EMAIL'] ?? process.env['TEST_USER_EMAIL'] ?? 'demo@example.com';
export const TEST_USER_PASSWORD = process.env['PLAYWRIGHT_TEST_USER_PASSWORD'] ?? process.env['TEST_USER_PASSWORD'] ?? 'password123';
export const TEST_USER_NAME = process.env['PLAYWRIGHT_TEST_USER_NAME'] ?? process.env['TEST_USER_NAME'] ?? 'Demo User';

interface ApiEnvelope<T> {
  data?: T;
  error?: { code?: string; message?: string };
}

interface ApiCallOptions {
  token?: string | null;
  body?: unknown;
  allowError?: boolean;
}

export const testState = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  referenceData: null as ReferenceTables | null,
  deviceIdsByName: new Map<string, number>(),
  filmIdsByName: new Map<string, number>(),
  lastCreatedDeviceId: null as number | null,
  lastCreatedFilmId: null as number | null,
  lastOtherUserDeviceId: null as number | null,
};

function resetState(): void {
  testState.accessToken = null;
  testState.refreshToken = null;
  testState.referenceData = null;
  testState.deviceIdsByName.clear();
  testState.filmIdsByName.clear();
  testState.lastCreatedDeviceId = null;
  testState.lastCreatedFilmId = null;
  testState.lastOtherUserDeviceId = null;
}

export async function apiCall<T = unknown>(method: string, path: string, options: ApiCallOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body != null) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token ?? testState.accessToken) {
    headers.Authorization = `Bearer ${options.token ?? testState.accessToken}`;
  }

  const response = await fetch(`${API_URL}/api/v1/${path}`, {
    method,
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;

  if (!response.ok && !options.allowError) {
    const message = payload?.error?.message ?? `API ${method} /api/v1/${path} failed with ${response.status}`;
    throw new Error(message);
  }

  return (payload?.data as T) ?? (null as T);
}

export async function apiCallWithError(method: string, path: string, options: ApiCallOptions = {}): Promise<{ status: number; message: string | null }> {
  const headers: Record<string, string> = {};
  if (options.body != null) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token ?? testState.accessToken) {
    headers.Authorization = `Bearer ${options.token ?? testState.accessToken}`;
  }

  const response = await fetch(`${API_URL}/api/v1/${path}`, {
    method,
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null) as ApiEnvelope<unknown> | null;
  return { status: response.status, message: payload?.error?.message ?? null };
}

export async function testCall<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiCall<T>('POST', path, { body });
}

export async function ensureUser(email = TEST_USER_EMAIL, password = TEST_USER_PASSWORD, name = TEST_USER_NAME): Promise<void> {
  await testCall('test/fixtures/users', {
    users: [{ email, password, name }],
  });
}

export async function loginAs(email = TEST_USER_EMAIL, password = TEST_USER_PASSWORD, name = TEST_USER_NAME): Promise<void> {
  const data = await testCall<{ accessToken: string; refreshToken: string; user: { email: string } }>('test/auth/login-as', {
    email,
    password,
    name,
  });

  testState.accessToken = data.accessToken;
  testState.refreshToken = data.refreshToken;
}

export async function loadReferenceData(): Promise<ReferenceTables> {
  if (testState.referenceData) {
    return testState.referenceData;
  }

  if (!testState.accessToken) {
    await loginAs();
  }

  const reference = await apiCall<ReferenceTables>('GET', 'reference');
  testState.referenceData = reference;
  return reference;
}

export async function createCameraFixture(params: {
  ownerEmail?: string;
  make: string;
  model: string;
  filmFormatCode?: string;
  frameSize?: string;
  loadMode?: 'direct' | 'interchangeable_back' | 'film_holder';
}): Promise<number> {
  const reference = await loadReferenceData();
  const filmFormatCode = params.filmFormatCode ?? '35mm';
  const filmFormat = reference.filmFormats.find((item) => item.code === filmFormatCode);
  const deviceType = reference.deviceTypes.find((item) => item.code === 'camera');

  if (!filmFormat || !deviceType) {
    throw new Error('Missing reference data for camera fixture creation');
  }

  const fixtures = await testCall<{ created: Array<{ id: number }>; userId: number }>('test/fixtures/devices', {
    userEmail: params.ownerEmail,
    devices: [
      {
        deviceTypeCode: 'camera',
        deviceTypeId: deviceType.id,
        filmFormatId: filmFormat.id,
        frameSize: params.frameSize ?? 'full_frame',
        make: params.make,
        model: params.model,
        canUnload: true,
        loadMode: params.loadMode ?? 'direct',
      },
    ],
  });

  const id = fixtures.created[0]?.id;
  if (!id) {
    throw new Error('Camera fixture endpoint did not return an id');
  }

  return id;
}

export async function createFilmLotFixture(params: {
  ownerEmail?: string;
  filmName: string;
  emulsionMatcher: (emulsionName: string) => boolean;
  filmFormatCode: string;
  packageLabelContains: string;
  quantity?: number;
  expirationDate?: string | null;
}): Promise<number> {
  const reference = await loadReferenceData();
  const emulsion = reference.emulsions.find((item) => params.emulsionMatcher(`${item.manufacturer} ${item.brand}`));
  const filmFormat = reference.filmFormats.find((item) => item.code === params.filmFormatCode);

  if (!emulsion || !filmFormat) {
    throw new Error('Missing emulsion or film format for film fixture creation');
  }

  const packageType = reference.packageTypes.find(
    (item) => item.filmFormatId === filmFormat.id && item.label.toLowerCase().includes(params.packageLabelContains.toLowerCase()),
  );

  if (!packageType) {
    throw new Error('Missing package type for film fixture creation');
  }

  const payload = {
    userEmail: params.ownerEmail,
    lots: [
      {
        emulsionId: emulsion.id,
        packageTypeId: packageType.id,
        filmFormatId: filmFormat.id,
        quantity: params.quantity ?? 1,
        expirationDate: params.expirationDate ?? null,
        films: [{ name: params.filmName }],
      },
    ],
  };

  try {
    const result = await testCall<{ lots: Array<{ films: Array<{ id: number }> }> }>('test/fixtures/film', payload);
    const id = result.lots[0]?.films?.[0]?.id;
    if (!id) {
      throw new Error('Film fixture endpoint did not return created film id');
    }

    return id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('already exists')) {
      throw error;
    }

    type FilmSummary = { id: number; name: string };
    type FilmListResponse = { items?: FilmSummary[] };
    const filmPayload = await apiCall<FilmSummary[] | FilmListResponse>('GET', 'film');
    const films = Array.isArray(filmPayload) ? filmPayload : (filmPayload.items ?? []);
    const existing = films.find((film) => film.name === params.filmName);
    if (!existing) {
      throw error;
    }

    return existing.id;
  }
}

export function findFilmFormatByLabel(reference: ReferenceTables, label: string): FilmFormat {
  const normalized = label.trim().toLowerCase();
  const match = reference.filmFormats.find(
    (item) => item.label.toLowerCase() === normalized || item.code.toLowerCase() === normalized,
  );

  if (!match) {
    throw new Error(`Film format not found for "${label}"`);
  }

  return match;
}

export function findPackageTypeByLabel(reference: ReferenceTables, filmFormatId: number, packageLabel: string): PackageType {
  const normalized = packageLabel.trim().toLowerCase();
  const match = reference.packageTypes.find(
    (item) => item.filmFormatId === filmFormatId && item.label.toLowerCase().includes(normalized.replace('-', ' ')),
  );

  if (!match) {
    throw new Error(`Package type not found for "${packageLabel}"`);
  }

  return match;
}

export function findStorageLocation(reference: ReferenceTables, codeOrLabel: string): StorageLocation {
  const normalized = codeOrLabel.trim().toLowerCase();
  const match = reference.storageLocations.find(
    (item) => item.code.toLowerCase() === normalized || item.label.toLowerCase() === normalized,
  );

  if (!match) {
    throw new Error(`Storage location not found for "${codeOrLabel}"`);
  }

  return match;
}

export async function recordFilmEvent(filmId: number, event: CreateFilmJourneyEventRequest): Promise<void> {
  await apiCall('POST', `film/${filmId}/events`, { body: event });
}

export const test = base.extend<{ _reset: void }>({
  _reset: [async ({}, use) => {
    resetState();
    const resetResponse = await fetch(`${API_URL}/api/v1/test/reset`, { method: 'DELETE' });
    if (!resetResponse.ok) {
      throw new Error(`DB reset failed: ${resetResponse.status}`);
    }

    await testCall('test/fixtures/reference');
    await ensureUser();
    await use();
  }, { auto: true, scope: 'test' }],
});

export const { Given, When, Then } = createBdd(test);
