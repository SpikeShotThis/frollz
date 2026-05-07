import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  DashboardInsights,
  DeviceUsageInsights,
  FilmQueueInsightItem,
  FilmWorkflowInsights,
  InsightRange,
  InsightsQuery,
  LabPerformanceInsights,
  SupplierPerformanceInsights
} from '@frollz2/schema';
import {
  FilmDeviceEntity,
  FilmEntity,
  FilmJourneyEventEntity,
  FilmLabEntity,
  FilmLotEntity
} from '../../infrastructure/entities/index.js';
import type { EmulsionEntity, FilmFormatEntity, PackageTypeEntity, DevelopmentProcessEntity } from '../../infrastructure/entities/reference.entities.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ACTIVE_FILM_STATES = new Set(['purchased', 'stored', 'loaded', 'exposed', 'removed', 'sent_for_dev', 'developed', 'scanned']);

const FILM_POPULATE = [
  'filmLot',
  'filmLot.supplier',
  'emulsion',
  'emulsion.developmentProcess',
  'emulsion.filmFormats',
  'packageType',
  'packageType.filmFormat',
  'filmFormat',
  'currentState',
  'currentDevice'
] as const;

const EVENT_POPULATE = [
  'film',
  'film.filmLot',
  'film.filmLot.supplier',
  'film.emulsion',
  'film.emulsion.developmentProcess',
  'film.emulsion.filmFormats',
  'film.packageType',
  'film.packageType.filmFormat',
  'film.filmFormat',
  'film.currentState',
  'filmState'
] as const;

const LOT_POPULATE = [
  'supplier',
  'emulsion',
  'emulsion.developmentProcess',
  'emulsion.filmFormats',
  'packageType',
  'packageType.filmFormat',
  'filmFormat'
] as const;

const DEVICE_POPULATE = ['deviceType', 'filmFormat', 'camera', 'interchangeableBack', 'filmHolder'] as const;

function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function daysBetween(startIso: string, endIso: string): number | null {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }
  return round((end - start) / MS_PER_DAY);
}

function daysSince(startIso: string, now: Date): number {
  return Math.max(0, round((now.getTime() - Date.parse(startIso)) / MS_PER_DAY));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? null;
  }
  const left = sorted[mid - 1];
  const right = sorted[mid];
  return left === undefined || right === undefined ? null : round((left + right) / 2, 2);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 2);
}

function rangeStart(range: InsightRange, now: Date): number | null {
  if (range === 'all') return null;
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 365;
  return now.getTime() - days * MS_PER_DAY;
}

function inRange(iso: string | null | undefined, start: number | null): boolean {
  if (start === null) return true;
  if (!iso) return false;
  const ts = Date.parse(iso);
  return !Number.isNaN(ts) && ts >= start;
}

function laterIso(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(right) > Date.parse(left) ? right : left;
}

function mapFilmFormat(entity: FilmFormatEntity) {
  return { id: entity.id, code: entity.code, label: entity.label };
}

function mapDevelopmentProcess(entity: DevelopmentProcessEntity) {
  return { id: entity.id, code: entity.code, label: entity.label };
}

function mapPackageType(entity: PackageTypeEntity) {
  return {
    id: entity.id,
    code: entity.code,
    label: entity.label,
    filmFormatId: entity.filmFormat.id,
    filmFormat: mapFilmFormat(entity.filmFormat)
  };
}

function mapEmulsion(entity: EmulsionEntity) {
  return {
    id: entity.id,
    brand: entity.brand,
    manufacturer: entity.manufacturer,
    isoSpeed: entity.isoSpeed,
    developmentProcessId: entity.developmentProcess.id,
    developmentProcess: mapDevelopmentProcess(entity.developmentProcess),
    balance: entity.balance,
    filmFormats: entity.filmFormats.getItems().map(mapFilmFormat)
  };
}

function labIdFrom(eventData: Record<string, unknown>): number | null {
  const value = eventData['labId'];
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function textFrom(eventData: Record<string, unknown>, key: string): string | null {
  const value = eventData[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function developmentCostFrom(eventData: Record<string, unknown>): { amount: number; currencyCode: string } | null {
  const cost = eventData['cost'];
  if (!cost || typeof cost !== 'object') return null;
  const raw = cost as Record<string, unknown>;
  return typeof raw['amount'] === 'number' && typeof raw['currencyCode'] === 'string'
    ? { amount: raw['amount'], currencyCode: raw['currencyCode'] }
    : null;
}

function loadedDeviceIdFrom(eventData: Record<string, unknown>): number | null {
  for (const key of ['cameraId', 'interchangeableBackId', 'filmHolderId']) {
    const value = eventData[key];
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }
  }
  return null;
}

function eventOrderValue(event: FilmJourneyEventEntity): number {
  const ts = Date.parse(event.occurredAt);
  return Number.isNaN(ts) ? 0 : ts;
}

function buildFilmQueueItem(event: FilmJourneyEventEntity, now: Date, labNameById: Map<number, string>): FilmQueueInsightItem {
  const labId = labIdFrom(event.eventData);
  return {
    filmId: event.film.id,
    filmName: event.film.name,
    occurredAt: event.occurredAt,
    daysWaiting: daysSince(event.occurredAt, now),
    emulsion: mapEmulsion(event.film.emulsion),
    filmFormat: mapFilmFormat(event.film.filmFormat),
    developmentProcess: mapDevelopmentProcess(event.film.emulsion.developmentProcess),
    labId,
    labName: textFrom(event.eventData, 'labName') ?? (labId ? labNameById.get(labId) ?? null : null)
  };
}

function deviceName(device: FilmDeviceEntity): string {
  if (device.camera) return `${device.camera.make} ${device.camera.model}`;
  if (device.interchangeableBack) return `${device.interchangeableBack.name} ${device.interchangeableBack.system}`;
  if (device.filmHolder) return `${device.filmHolder.name} ${device.filmHolder.brand}`;
  return `Device ${device.id}`;
}

@Injectable()
export class InsightsService {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {}

  async film(userId: number, query: InsightsQuery): Promise<FilmWorkflowInsights> {
    const now = new Date();
    const start = rangeStart(query.range, now);
    const generatedAt = now.toISOString();
    const [films, events, labs] = await Promise.all([
      this.entityManager.find(FilmEntity, { user: userId }, { populate: FILM_POPULATE }),
      this.entityManager.find(FilmJourneyEventEntity, { user: userId }, { populate: EVENT_POPULATE, orderBy: { occurredAt: 'asc', id: 'asc' } }),
      this.entityManager.find(FilmLabEntity, { user: userId })
    ]);
    const labNameById = new Map(labs.map((lab) => [lab.id, lab.name]));
    const latestEventByFilmAndState = this.latestEventByFilmAndState(events);
    const activeFilms = films.filter((film) => ACTIVE_FILM_STATES.has(film.currentState.code));
    const removedEvents = films
      .filter((film) => film.currentState.code === 'removed')
      .map((film) => latestEventByFilmAndState.get(`${film.id}:removed`) ?? null)
      .filter((event): event is FilmJourneyEventEntity => event !== null);
    const labQueueEvents = films
      .filter((film) => film.currentState.code === 'sent_for_dev')
      .map((film) => latestEventByFilmAndState.get(`${film.id}:sent_for_dev`) ?? null)
      .filter((event): event is FilmJourneyEventEntity => event !== null);
    const recentCompletions = events.filter((event) => event.filmState.code === 'developed' && inRange(event.occurredAt, start)).length;
    const oldestWaitingEvent = this.oldestEvent(removedEvents);
    const oldestLabQueueEvent = this.oldestEvent(labQueueEvents);

    return {
      range: query.range,
      generatedAt,
      totals: {
        totalFilms: films.length,
        activeFilms: activeFilms.length,
        removedNotSent: removedEvents.length,
        atLab: labQueueEvents.length,
        recentCompletions
      },
      oldestWaitingFilm: oldestWaitingEvent ? buildFilmQueueItem(oldestWaitingEvent, now, labNameById) : null,
      oldestLabQueueItem: oldestLabQueueEvent ? buildFilmQueueItem(oldestLabQueueEvent, now, labNameById) : null,
      byFormat: this.countBy(activeFilms, (film) => ({
        key: String(film.filmFormat.id),
        label: film.filmFormat.label
      })),
      byDevelopmentProcess: this.countBy(activeFilms, (film) => ({
        key: String(film.emulsion.developmentProcess.id),
        label: film.emulsion.developmentProcess.label
      }))
    };
  }

  async labs(userId: number, query: InsightsQuery): Promise<LabPerformanceInsights> {
    const now = new Date();
    const start = rangeStart(query.range, now);
    const generatedAt = now.toISOString();
    const [films, events, labs] = await Promise.all([
      this.entityManager.find(FilmEntity, { user: userId }, { populate: FILM_POPULATE }),
      this.entityManager.find(FilmJourneyEventEntity, { user: userId }, { populate: EVENT_POPULATE, orderBy: { occurredAt: 'asc', id: 'asc' } }),
      this.entityManager.find(FilmLabEntity, { user: userId })
    ]);
    const labNameById = new Map(labs.map((lab) => [lab.id, lab.name]));
    const latestEventByFilmAndState = this.latestEventByFilmAndState(events);
    const rows = new Map<string, {
      labId: number;
      labName: string;
      developmentProcess: DevelopmentProcessEntity;
      turnarounds: number[];
      activeQueueCount: number;
      lastUsedAt: string | null;
      costsByCurrency: Map<string, number[]>;
    }>();
    const sentEvents = events.filter((event) => event.filmState.code === 'sent_for_dev' && inRange(event.occurredAt, start));
    const developedEventsByFilmId = new Map<number, FilmJourneyEventEntity[]>();
    for (const event of events.filter((candidate) => candidate.filmState.code === 'developed')) {
      const list = developedEventsByFilmId.get(event.film.id) ?? [];
      list.push(event);
      developedEventsByFilmId.set(event.film.id, list);
    }

    for (const sentEvent of sentEvents) {
      const labId = labIdFrom(sentEvent.eventData);
      if (!labId) continue;
      const row = this.labRow(rows, sentEvent, labId, labNameById);
      row.lastUsedAt = laterIso(row.lastUsedAt, sentEvent.occurredAt);
      const cost = developmentCostFrom(sentEvent.eventData);
      if (cost) {
        const values = row.costsByCurrency.get(cost.currencyCode) ?? [];
        values.push(cost.amount);
        row.costsByCurrency.set(cost.currencyCode, values);
      }
      const developed = (developedEventsByFilmId.get(sentEvent.film.id) ?? []).find((candidate) => {
        const candidateLabId = labIdFrom(candidate.eventData);
        return candidateLabId === labId && eventOrderValue(candidate) >= eventOrderValue(sentEvent);
      });
      if (developed) {
        const turnaround = daysBetween(sentEvent.occurredAt, developed.occurredAt);
        if (turnaround !== null) {
          row.turnarounds.push(turnaround);
        }
        row.lastUsedAt = laterIso(row.lastUsedAt, developed.occurredAt);
      }
    }

    for (const film of films.filter((film) => film.currentState.code === 'sent_for_dev')) {
      const latestSent = latestEventByFilmAndState.get(`${film.id}:sent_for_dev`);
      if (!latestSent) continue;
      const labId = labIdFrom(latestSent.eventData);
      if (!labId) continue;
      const row = this.labRow(rows, latestSent, labId, labNameById);
      row.activeQueueCount += 1;
      row.lastUsedAt = laterIso(row.lastUsedAt, latestSent.occurredAt);
    }

    return {
      range: query.range,
      generatedAt,
      rows: [...rows.values()]
        .map((row) => ({
          labId: row.labId,
          labName: row.labName,
          developmentProcess: mapDevelopmentProcess(row.developmentProcess),
          completedCount: row.turnarounds.length,
          activeQueueCount: row.activeQueueCount,
          medianTurnaroundDays: median(row.turnarounds),
          fastestTurnaroundDays: row.turnarounds.length ? Math.min(...row.turnarounds) : null,
          slowestTurnaroundDays: row.turnarounds.length ? Math.max(...row.turnarounds) : null,
          lastUsedAt: row.lastUsedAt,
          developmentCostByCurrency: [...row.costsByCurrency.entries()].map(([currencyCode, values]) => ({
            currencyCode,
            averageAmount: average(values) ?? 0,
            medianAmount: median(values) ?? 0
          }))
        }))
        .sort((a, b) => b.activeQueueCount - a.activeQueueCount || b.completedCount - a.completedCount || a.labName.localeCompare(b.labName))
        .slice(0, query.limit)
    };
  }

  async suppliers(userId: number, query: InsightsQuery): Promise<SupplierPerformanceInsights> {
    const now = new Date();
    const start = rangeStart(query.range, now);
    const generatedAt = now.toISOString();
    const lots = await this.entityManager.find(FilmLotEntity, { user: userId }, { populate: LOT_POPULATE });
    const rows = new Map<string, {
      emulsion: EmulsionEntity;
      packageType: PackageTypeEntity;
      filmFormat: FilmFormatEntity;
      currencyCode: string;
      packagePrices: number[];
      unitPrices: number[];
      purchaseCount: number;
      totalUnitsPurchased: number;
      lastPurchaseDate: string | null;
      lowest: { packagePrice: number; unitPrice: number; supplierId: number | null; supplierName: string | null } | null;
    }>();

    for (const lot of lots) {
      const purchaseDate = lot.purchaseInfo?.obtainedDate ?? lot.createdAt;
      const price = lot.purchaseInfo?.price;
      const currencyCode = lot.purchaseInfo?.currencyCode;
      if (!inRange(purchaseDate, start) || typeof price !== 'number' || !currencyCode || lot.quantity <= 0) {
        continue;
      }
      const key = `${lot.emulsion.id}:${lot.packageType.id}:${lot.filmFormat.id}:${currencyCode}`;
      const row = rows.get(key) ?? {
        emulsion: lot.emulsion,
        packageType: lot.packageType,
        filmFormat: lot.filmFormat,
        currencyCode,
        packagePrices: [],
        unitPrices: [],
        purchaseCount: 0,
        totalUnitsPurchased: 0,
        lastPurchaseDate: null,
        lowest: null
      };
      const unitPrice = price / lot.quantity;
      row.packagePrices.push(price);
      row.unitPrices.push(unitPrice);
      row.purchaseCount += 1;
      row.totalUnitsPurchased += lot.quantity;
      row.lastPurchaseDate = laterIso(row.lastPurchaseDate, purchaseDate);
      if (!row.lowest || price < row.lowest.packagePrice) {
        row.lowest = {
          packagePrice: price,
          unitPrice,
          supplierId: lot.supplier?.id ?? null,
          supplierName: lot.supplier?.name ?? null
        };
      }
      rows.set(key, row);
    }

    return {
      range: query.range,
      generatedAt,
      rows: [...rows.values()]
        .map((row) => ({
          emulsion: mapEmulsion(row.emulsion),
          packageType: mapPackageType(row.packageType),
          filmFormat: mapFilmFormat(row.filmFormat),
          currencyCode: row.currencyCode,
          lowestPackagePrice: row.lowest?.packagePrice ?? 0,
          medianPackagePrice: median(row.packagePrices) ?? 0,
          lowestUnitPrice: row.lowest?.unitPrice ?? 0,
          medianUnitPrice: median(row.unitPrices) ?? 0,
          bestSupplier: row.lowest?.supplierId && row.lowest.supplierName
            ? { supplierId: row.lowest.supplierId, supplierName: row.lowest.supplierName }
            : null,
          purchaseCount: row.purchaseCount,
          totalUnitsPurchased: row.totalUnitsPurchased,
          lastPurchaseDate: row.lastPurchaseDate ?? generatedAt
        }))
        .sort((a, b) => b.purchaseCount - a.purchaseCount || a.lowestUnitPrice - b.lowestUnitPrice)
        .slice(0, query.limit)
    };
  }

  async devices(userId: number, query: InsightsQuery): Promise<DeviceUsageInsights> {
    const now = new Date();
    const start = rangeStart(query.range, now);
    const generatedAt = now.toISOString();
    const [devices, films, events] = await Promise.all([
      this.entityManager.find(FilmDeviceEntity, { user: userId }, { populate: DEVICE_POPULATE }),
      this.entityManager.find(FilmEntity, { user: userId, currentState: { code: { $in: ['loaded', 'exposed'] } } }, { populate: FILM_POPULATE }),
      this.entityManager.find(FilmJourneyEventEntity, { user: userId, filmState: { code: 'loaded' } }, { populate: EVENT_POPULATE })
    ]);
    const activeByDevice = new Map<number, number>();
    for (const film of films) {
      if (!film.currentDevice) continue;
      activeByDevice.set(film.currentDevice.id, (activeByDevice.get(film.currentDevice.id) ?? 0) + 1);
    }
    const loadsByDevice = new Map<number, { count: number; lastLoadedAt: string | null }>();
    for (const event of events) {
      if (!inRange(event.occurredAt, start)) continue;
      const deviceId = loadedDeviceIdFrom(event.eventData);
      if (!deviceId) continue;
      const value = loadsByDevice.get(deviceId) ?? { count: 0, lastLoadedAt: null };
      value.count += 1;
      value.lastLoadedAt = laterIso(value.lastLoadedAt, event.occurredAt);
      loadsByDevice.set(deviceId, value);
    }

    return {
      range: query.range,
      generatedAt,
      totalDevices: devices.length,
      activeLoads: [...activeByDevice.values()].reduce((sum, value) => sum + value, 0),
      rows: devices
        .map((device) => {
          const usage = loadsByDevice.get(device.id) ?? { count: 0, lastLoadedAt: null };
          return {
            deviceId: device.id,
            deviceName: deviceName(device),
            deviceTypeCode: device.deviceType.code,
            filmFormat: mapFilmFormat(device.filmFormat),
            loadCount: usage.count,
            activeLoadCount: activeByDevice.get(device.id) ?? 0,
            lastLoadedAt: usage.lastLoadedAt
          };
        })
        .sort((a, b) => b.loadCount - a.loadCount || b.activeLoadCount - a.activeLoadCount || a.deviceName.localeCompare(b.deviceName))
        .slice(0, query.limit)
    };
  }

  async dashboard(userId: number, query: InsightsQuery): Promise<DashboardInsights> {
    const [film, suppliers] = await Promise.all([
      this.film(userId, query),
      this.suppliers(userId, query)
    ]);
    const bottlenecks = [
      { key: 'removed', label: 'Removed, not sent', count: film.totals.removedNotSent, href: '/film?stateCode=removed' },
      { key: 'at-lab', label: 'At lab', count: film.totals.atLab, href: '/film?stateCode=sent_for_dev' }
    ].sort((a, b) => b.count - a.count);

    return {
      range: query.range,
      generatedAt: film.generatedAt,
      slowestLabQueue: film.oldestLabQueueItem,
      bestRecentPrice: suppliers.rows[0] ?? null,
      workflowBottleneck: (bottlenecks[0]?.count ?? 0) > 0 ? bottlenecks[0] ?? null : null
    };
  }

  private latestEventByFilmAndState(events: FilmJourneyEventEntity[]): Map<string, FilmJourneyEventEntity> {
    const latest = new Map<string, FilmJourneyEventEntity>();
    for (const event of events) {
      const key = `${event.film.id}:${event.filmState.code}`;
      const current = latest.get(key);
      if (!current || eventOrderValue(event) > eventOrderValue(current) || (event.occurredAt === current.occurredAt && event.id > current.id)) {
        latest.set(key, event);
      }
    }
    return latest;
  }

  private oldestEvent(events: FilmJourneyEventEntity[]): FilmJourneyEventEntity | null {
    return [...events].sort((a, b) => eventOrderValue(a) - eventOrderValue(b) || a.id - b.id)[0] ?? null;
  }

  private countBy<T>(items: T[], keyFn: (item: T) => { key: string; label: string }) {
    const counts = new Map<string, { key: string; label: string; count: number }>();
    for (const item of items) {
      const key = keyFn(item);
      const existing = counts.get(key.key) ?? { ...key, count: 0 };
      existing.count += 1;
      counts.set(key.key, existing);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  private labRow(
    rows: Map<string, {
      labId: number;
      labName: string;
      developmentProcess: DevelopmentProcessEntity;
      turnarounds: number[];
      activeQueueCount: number;
      lastUsedAt: string | null;
      costsByCurrency: Map<string, number[]>;
    }>,
    event: FilmJourneyEventEntity,
    labId: number,
    labNameById: Map<number, string>
  ) {
    const process = event.film.emulsion.developmentProcess;
    const key = `${labId}:${process.id}`;
    const existing = rows.get(key);
    if (existing) return existing;
    const row = {
      labId,
      labName: textFrom(event.eventData, 'labName') ?? labNameById.get(labId) ?? `Lab ${labId}`,
      developmentProcess: process,
      turnarounds: [],
      activeQueueCount: 0,
      lastUsedAt: null,
      costsByCurrency: new Map<string, number[]>()
    };
    rows.set(key, row);
    return row;
  }
}
