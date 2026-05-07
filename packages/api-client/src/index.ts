import {
  createEmulsionRequestSchema,
  createFilmDeviceRequestSchema,
  createFilmJourneyEventRequestSchema,
  createFilmLabRequestSchema,
  createFilmSupplierRequestSchema,
  currentUserSchema,
  deviceLoadTimelineEventSchema,
  emulsionSchema,
  exportDataSchema,
  filmCreateRequestSchema,
  filmDetailSchema,
  filmDeviceSchema,
  filmFrameSchema,
  filmJourneyEventSchema,
  filmLabActivitySchema,
  filmListQuerySchema,
  filmLotCreateRequestSchema,
  filmLabSchema,
  filmListResponseSchema,
  filmSummarySchema,
  filmSupplierActivitySchema,
  filmSupplierSchema,
  importDataRequestSchema,
  importDataResponseSchema,
  listFilmLabsQuerySchema,
  listReferenceValuesQuerySchema,
  listFilmSuppliersQuerySchema,
  dashboardInsightsSchema,
  deviceUsageInsightsSchema,
  filmWorkflowInsightsSchema,
  insightsQuerySchema,
  labPerformanceInsightsSchema,
  loginRequestSchema,
  refreshRequestSchema,
  referenceValueSchema,
  referenceTablesSchema,
  registerRequestSchema,
  supplierPerformanceInsightsSchema,
  tokenPairSchema,
  updateEmulsionRequestSchema,
  updateFilmDeviceRequestSchema,
  updateFilmFrameRequestSchema,
  updateFilmLabRequestSchema,
  updateFilmSupplierRequestSchema,
  filmUpdateRequestSchema,
  type CreateEmulsionRequest,
  type CreateFilmDeviceRequest,
  type CreateFilmJourneyEventRequest,
  type CreateFilmLabRequest,
  type CreateFilmSupplierRequest,
  type CurrentUser,
  type DeviceLoadTimelineEvent,
  type Emulsion,
  type ExportData,
  type FilmCreateRequest,
  type FilmDetail,
  type FilmDevice,
  type FilmFrame,
  type FilmJourneyEvent,
  type FilmLab,
  type FilmLabActivity,
  type FilmListResponse,
  type FilmSummary,
  type FilmSupplier,
  type FilmSupplierActivity,
  type ImportDataResponse,
  type ImportDataRequest,
  type DashboardInsights,
  type DeviceUsageInsights,
  type FilmWorkflowInsights,
  type LabPerformanceInsights,
  type LoginRequest,
  type ReferenceTables,
  type ReferenceValue,
  type RefreshRequest,
  type RegisterRequest,
  type SupplierPerformanceInsights,
  type TokenPair,
  type UpdateEmulsionRequest,
  type UpdateFilmDeviceRequest,
  type UpdateFilmFrameRequest,
  type UpdateFilmLabRequest,
  type UpdateFilmSupplierRequest,
  type FilmUpdateRequest
} from '@frollz2/schema';
import { z } from 'zod';

export type FilmListQuery = z.input<typeof filmListQuerySchema>;
export type ListFilmLabsQuery = z.input<typeof listFilmLabsQuerySchema>;
export type ListFilmSuppliersQuery = z.input<typeof listFilmSuppliersQuerySchema>;
export type ListReferenceValuesQuery = z.input<typeof listReferenceValuesQuerySchema>;
export type InsightsQuery = z.input<typeof insightsQuerySchema>;

export type ApiErrorMsg = {
  en: string;
  label: string;
  params?: Record<string, string | number>;
};

export class ApiError extends Error {
  public readonly code: string;
  public readonly msg: ApiErrorMsg;
  public readonly details: readonly unknown[];

  constructor(code: string, msg: ApiErrorMsg, details: readonly unknown[] = []) {
    super(msg.en);
    this.name = 'ApiError';
    this.code = code;
    this.msg = msg;
    this.details = details;
  }
}

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken?: () => string | null;
  fetchImpl?: typeof fetch;
};

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    search.set(key, String(value));
  }

  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

function createIdempotencyKey(): string {
  if (typeof globalThis !== 'undefined' && 'crypto' in globalThis) {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: (() => string | null) | undefined;
  private readonly fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getAccessToken = options.getAccessToken;
    const baseFetch = options.fetchImpl ?? fetch;
    this.fetchImpl = (input, init) => baseFetch(input, init);
  }

  async register(input: RegisterRequest): Promise<TokenPair> {
    const payload = registerRequestSchema.parse(input);
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, tokenPairSchema);
  }

  async login(input: LoginRequest): Promise<TokenPair> {
    const payload = loginRequestSchema.parse(input);
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, tokenPairSchema);
  }

  async refreshTokens(input: RefreshRequest): Promise<TokenPair> {
    const payload = refreshRequestSchema.parse(input);
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, tokenPairSchema);
  }

  async logout(input: RefreshRequest): Promise<void> {
    const payload = refreshRequestSchema.parse(input);
    await this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, z.unknown());
  }

  async getCurrentUser(): Promise<CurrentUser> {
    return this.request('/auth/me', {}, currentUserSchema);
  }

  async getReferenceTables(): Promise<ReferenceTables> {
    return this.request('/reference', {}, referenceTablesSchema);
  }

  async getReferenceValues(query: ListReferenceValuesQuery): Promise<ReferenceValue[]> {
    const payload = listReferenceValuesQuerySchema.parse(query);
    return this.request(`/reference/values${toQuery(payload)}`, {}, z.array(referenceValueSchema));
  }

  async getFilms(query: FilmListQuery = {}): Promise<FilmListResponse> {
    const payload = filmListQuerySchema.parse(query);
    return this.request(`/film${toQuery(payload)}`, {}, filmListResponseSchema);
  }

  async getFilm(id: number): Promise<FilmDetail> {
    return this.request(`/film/${id}`, {}, filmDetailSchema);
  }

  async getFilmEvents(id: number): Promise<FilmJourneyEvent[]> {
    return this.request(`/film/${id}/events`, {}, z.array(filmJourneyEventSchema));
  }

  async getFilmFrames(id: number): Promise<FilmFrame[]> {
    return this.request(`/film/${id}/frames`, {}, z.array(filmFrameSchema));
  }

  async createFilm(input: FilmCreateRequest, idempotencyKey?: string): Promise<FilmSummary> {
    const payload = filmCreateRequestSchema.parse(input);
    const lotPayload = filmLotCreateRequestSchema.parse({
      emulsionId: payload.emulsionId,
      packageTypeId: payload.packageTypeId,
      filmFormatId: payload.filmFormatId,
      quantity: 1,
      expirationDate: payload.expirationDate,
      supplierName: payload.supplierName,
      purchaseInfo: payload.purchaseInfo,
      films: [{ name: payload.name }]
    });

    const createdLot = await this.request('/film/lots', {
      method: 'POST',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(lotPayload)
    }, z.object({ films: z.array(filmSummarySchema) }));

    const createdFilm = createdLot.films.at(0);
    if (!createdFilm) {
      throw new Error('Film lot created without film entries');
    }

    return createdFilm;
  }

  async updateFilm(id: number, input: FilmUpdateRequest, idempotencyKey?: string): Promise<FilmSummary> {
    const payload = filmUpdateRequestSchema.parse(input);
    return this.request(`/film/${id}`, {
      method: 'PATCH',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(payload)
    }, filmSummarySchema);
  }

  async createFilmJourneyEvent(id: number, input: CreateFilmJourneyEventRequest, idempotencyKey?: string): Promise<FilmJourneyEvent> {
    const payload = createFilmJourneyEventRequestSchema.parse(input);
    return this.request(`/film/${id}/events`, {
      method: 'POST',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(payload)
    }, filmJourneyEventSchema);
  }

  async updateFilmFrame(filmId: number, frameId: number, input: UpdateFilmFrameRequest, idempotencyKey?: string): Promise<FilmFrame> {
    const payload = updateFilmFrameRequestSchema.parse(input);
    return this.request(`/film/${filmId}/frames/${frameId}`, {
      method: 'PATCH',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(payload)
    }, filmFrameSchema);
  }

  async getDevices(): Promise<FilmDevice[]> {
    return this.request('/devices', {}, z.array(filmDeviceSchema));
  }

  async getDevice(id: number): Promise<FilmDevice> {
    return this.request(`/devices/${id}`, {}, filmDeviceSchema);
  }

  async getDeviceLoadEvents(id: number): Promise<DeviceLoadTimelineEvent[]> {
    return this.request(`/devices/${id}/load-events`, {}, z.array(deviceLoadTimelineEventSchema));
  }

  async createDevice(input: CreateFilmDeviceRequest, idempotencyKey?: string): Promise<FilmDevice> {
    const payload = createFilmDeviceRequestSchema.parse(input);
    return this.request('/devices', {
      method: 'POST',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(payload)
    }, filmDeviceSchema);
  }

  async updateDevice(id: number, input: UpdateFilmDeviceRequest, idempotencyKey?: string): Promise<FilmDevice> {
    const payload = updateFilmDeviceRequestSchema.parse(input);
    return this.request(`/devices/${id}`, {
      method: 'PATCH',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(payload)
    }, filmDeviceSchema);
  }

  async deleteDevice(id: number, idempotencyKey?: string): Promise<void> {
    await this.request(`/devices/${id}`, {
      method: 'DELETE',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {})
    }, z.unknown());
  }

  async getEmulsions(): Promise<Emulsion[]> {
    return this.request('/emulsions', {}, z.array(emulsionSchema));
  }

  async getEmulsion(id: number): Promise<Emulsion> {
    return this.request(`/emulsions/${id}`, {}, emulsionSchema);
  }

  async createEmulsion(input: CreateEmulsionRequest, idempotencyKey?: string): Promise<Emulsion> {
    const payload = createEmulsionRequestSchema.parse(input);
    return this.request('/emulsions', {
      method: 'POST',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(payload)
    }, emulsionSchema);
  }

  async updateEmulsion(id: number, input: UpdateEmulsionRequest, idempotencyKey?: string): Promise<Emulsion> {
    const payload = updateEmulsionRequestSchema.parse(input);
    return this.request(`/emulsions/${id}`, {
      method: 'PATCH',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(payload)
    }, emulsionSchema);
  }

  async deleteEmulsion(id: number, idempotencyKey?: string): Promise<void> {
    await this.request(`/emulsions/${id}`, {
      method: 'DELETE',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {})
    }, z.unknown());
  }

  async getFilmLabs(query: ListFilmLabsQuery = {}): Promise<FilmLab[]> {
    const payload = listFilmLabsQuerySchema.parse(query);
    return this.request(`/film-labs${toQuery(payload)}`, {}, z.array(filmLabSchema));
  }

  async getFilmLab(id: number): Promise<FilmLab> {
    return this.request(`/film-labs/${id}`, {}, filmLabSchema);
  }

  async getFilmLabActivity(id: number): Promise<FilmLabActivity> {
    return this.request(`/film-labs/${id}/activity`, {}, filmLabActivitySchema);
  }

  async createFilmLab(input: CreateFilmLabRequest, idempotencyKey?: string): Promise<FilmLab> {
    const payload = createFilmLabRequestSchema.parse(input);
    return this.request('/film-labs', {
      method: 'POST',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(payload)
    }, filmLabSchema);
  }

  async updateFilmLab(id: number, input: UpdateFilmLabRequest, idempotencyKey?: string): Promise<FilmLab> {
    const payload = updateFilmLabRequestSchema.parse(input);
    return this.request(`/film-labs/${id}`, {
      method: 'PATCH',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(payload)
    }, filmLabSchema);
  }

  async getFilmSuppliers(query: ListFilmSuppliersQuery = {}): Promise<FilmSupplier[]> {
    const payload = listFilmSuppliersQuerySchema.parse(query);
    return this.request(`/film-suppliers${toQuery(payload)}`, {}, z.array(filmSupplierSchema));
  }

  async getFilmSupplier(id: number): Promise<FilmSupplier> {
    return this.request(`/film-suppliers/${id}`, {}, filmSupplierSchema);
  }

  async getFilmSupplierActivity(id: number): Promise<FilmSupplierActivity> {
    return this.request(`/film-suppliers/${id}/activity`, {}, filmSupplierActivitySchema);
  }

  async createFilmSupplier(input: CreateFilmSupplierRequest, idempotencyKey?: string): Promise<FilmSupplier> {
    const payload = createFilmSupplierRequestSchema.parse(input);
    return this.request('/film-suppliers', {
      method: 'POST',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(payload)
    }, filmSupplierSchema);
  }

  async updateFilmSupplier(id: number, input: UpdateFilmSupplierRequest, idempotencyKey?: string): Promise<FilmSupplier> {
    const payload = updateFilmSupplierRequestSchema.parse(input);
    return this.request(`/film-suppliers/${id}`, {
      method: 'PATCH',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(payload)
    }, filmSupplierSchema);
  }

  async getFilmInsights(query: InsightsQuery = {}): Promise<FilmWorkflowInsights> {
    const payload = insightsQuerySchema.parse(query);
    return this.request(`/insights/film${toQuery(payload)}`, {}, filmWorkflowInsightsSchema);
  }

  async getLabInsights(query: InsightsQuery = {}): Promise<LabPerformanceInsights> {
    const payload = insightsQuerySchema.parse(query);
    return this.request(`/insights/admin/labs${toQuery(payload)}`, {}, labPerformanceInsightsSchema);
  }

  async getSupplierInsights(query: InsightsQuery = {}): Promise<SupplierPerformanceInsights> {
    const payload = insightsQuerySchema.parse(query);
    return this.request(`/insights/admin/suppliers${toQuery(payload)}`, {}, supplierPerformanceInsightsSchema);
  }

  async getDeviceInsights(query: InsightsQuery = {}): Promise<DeviceUsageInsights> {
    const payload = insightsQuerySchema.parse(query);
    return this.request(`/insights/devices/summary${toQuery(payload)}`, {}, deviceUsageInsightsSchema);
  }

  async getDashboardInsights(query: InsightsQuery = {}): Promise<DashboardInsights> {
    const payload = insightsQuerySchema.parse(query);
    return this.request(`/insights/dashboard${toQuery(payload)}`, {}, dashboardInsightsSchema);
  }

  async exportData(): Promise<ExportData> {
    return this.request('/admin/export', {}, exportDataSchema);
  }

  async importData(payload: ImportDataRequest, idempotencyKey?: string): Promise<ImportDataResponse | { success: true }> {
    const input = importDataRequestSchema.parse(payload);
    return this.request('/admin/import', {
      method: 'POST',
      ...(idempotencyKey ? { headers: { 'idempotency-key': idempotencyKey } } : {}),
      body: JSON.stringify(input)
    }, z.union([importDataResponseSchema, z.object({ success: z.literal(true) })]));
  }

  async requestRaw(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const method = (init.method ?? 'GET').toUpperCase();

    const accessToken = this.getAccessToken?.();
    if (accessToken) {
      headers.set('authorization', `Bearer ${accessToken}`);
    }

    if (method !== 'GET' && method !== 'HEAD' && !headers.has('idempotency-key')) {
      headers.set('idempotency-key', createIdempotencyKey());
    }

    if (!headers.has('content-type') && init.body !== undefined) {
      headers.set('content-type', 'application/json');
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers
    });

    if (!response.ok) {
      const rawPayload = await response.json().catch(() => null) as Record<string, unknown> | null;
      const errorObj = rawPayload?.['error'];
      if (errorObj && typeof errorObj === 'object' && 'msg' in errorObj) {
        const e = errorObj as Record<string, unknown>;
        const raw = e['msg'] as Record<string, unknown>;
        const code = typeof e['code'] === 'string' ? e['code'] : 'UNKNOWN';
        const en = typeof raw['en'] === 'string' ? raw['en'] : response.statusText;
        const label = typeof raw['label'] === 'string' ? raw['label'] : 'errors.unknown';
        const params = raw['params'] && typeof raw['params'] === 'object' ? raw['params'] as Record<string, string | number> : undefined;
        const details = Array.isArray(e['details']) ? e['details'] as unknown[] : [];
        throw new ApiError(code, { en, label, ...(params ? { params } : {}) }, details);
      }
      const fallbackMessage = (errorObj && typeof errorObj === 'object' && 'message' in errorObj && String(errorObj['message']))
        || response.statusText;
      throw new Error(`API ${response.status} ${path}: ${fallbackMessage}`);
    }

    return response;
  }

  private async request<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
    const response = await this.requestRaw(path, init);
    const rawPayload = await response.json().catch(() => null);
    const payload = this.unwrapEnvelope(rawPayload);
    return schema.parse(payload);
  }

  private unwrapEnvelope(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    if ('data' in payload) {
      return (payload as { data: unknown }).data;
    }

    return payload;
  }
}
