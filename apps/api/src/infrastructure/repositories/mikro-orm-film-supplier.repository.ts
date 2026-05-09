import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { CreateFilmSupplierRequest, FilmSupplier, FilmSupplierActivity, FilmSupplierFormatStats, ListFilmSuppliersQuery, UpdateFilmSupplierRequest } from '@frollz2/schema';
import { FilmSupplierRepository } from './film-supplier.repository.js';
import { FilmLotEntity, FilmSupplierEntity, UserEntity } from '../entities/index.js';
import { mapEmulsionEntity, mapFilmFormatEntity, mapFilmSupplierEntity, mapPackageTypeEntity } from '../mappers/index.js';
import { normalizeReferenceValue, sanitizeReferenceValue } from '../../domain/reference/reference-value.utils.js';
import { average, median, round } from '../../common/utils/stats.js';

const LOT_POPULATE = [
  'supplier',
  'user',
  'emulsion',
  'emulsion.developmentProcess',
  'emulsion.filmFormats',
  'packageType',
  'packageType.filmFormat',
  'filmFormat'
] as const;

@Injectable()
export class MikroOrmFilmSupplierRepository extends FilmSupplierRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async list(userId: number, query: ListFilmSuppliersQuery): Promise<FilmSupplier[]> {
    const normalizedQuery = normalizeReferenceValue(query.q);
    const entities = await this.entityManager.find(
      FilmSupplierEntity,
      {
        user: userId,
        ...(query.includeInactive ? {} : { active: true }),
        ...(normalizedQuery.length > 0 ? { normalizedName: { $like: `${normalizedQuery}%` } } : {})
      },
      { orderBy: [{ active: 'desc' }, { name: 'asc' }], limit: query.limit, populate: ['user'] }
    );

    return entities.map(mapFilmSupplierEntity);
  }

  async findById(userId: number, supplierId: number): Promise<FilmSupplier | null> {
    const entity = await this.entityManager.findOne(FilmSupplierEntity, { id: supplierId, user: userId }, { populate: ['user'] });
    return entity ? mapFilmSupplierEntity(entity) : null;
  }

  async activity(userId: number, supplierId: number): Promise<FilmSupplierActivity | null> {
    const supplier = await this.entityManager.findOne(FilmSupplierEntity, { id: supplierId, user: userId }, { populate: ['user'] });
    if (!supplier) {
      return null;
    }

    const lots = await this.entityManager.find(
      FilmLotEntity,
      { user: userId, supplier: supplierId },
      { populate: LOT_POPULATE, orderBy: { createdAt: 'desc', id: 'desc' } }
    );
    const statsByFormat = new Map<number, {
      filmFormat: FilmLotEntity['filmFormat'];
      purchaseCount: number;
      totalUnitsPurchased: number;
      packagePricesByCurrency: Map<string, number[]>;
      unitPricesByCurrency: Map<string, number[]>;
      lastPurchaseDate: string | null;
    }>();

    const purchases = lots.map((lot) => {
      const purchasedAt = lot.purchaseInfo?.obtainedDate ?? lot.createdAt;
      const price = lot.purchaseInfo?.price;
      const currencyCode = lot.purchaseInfo?.currencyCode;
      const row = getFormatStatsRow(statsByFormat, lot);
      row.purchaseCount += 1;
      row.totalUnitsPurchased += lot.quantity;
      row.lastPurchaseDate = laterIso(row.lastPurchaseDate, purchasedAt);

      if (typeof price === 'number' && currencyCode && lot.quantity > 0) {
        const unitPrice = round(price / lot.quantity, 2);
        const packagePrices = row.packagePricesByCurrency.get(currencyCode) ?? [];
        const unitPrices = row.unitPricesByCurrency.get(currencyCode) ?? [];
        packagePrices.push(price);
        unitPrices.push(unitPrice);
        row.packagePricesByCurrency.set(currencyCode, packagePrices);
        row.unitPricesByCurrency.set(currencyCode, unitPrices);
      }

      return {
        filmLotId: lot.id,
        quantity: lot.quantity,
        purchasedAt,
        price: typeof price === 'number' && currencyCode ? { amount: price, currencyCode } : null,
        unitPrice: typeof price === 'number' && currencyCode && lot.quantity > 0 ? { amount: round(price / lot.quantity, 2), currencyCode } : null,
        channel: lot.purchaseInfo?.channel ?? null,
        orderRef: lot.purchaseInfo?.orderRef ?? null,
        emulsion: mapEmulsionEntity(lot.emulsion),
        packageType: mapPackageTypeEntity(lot.packageType),
        filmFormat: mapFilmFormatEntity(lot.filmFormat)
      };
    });

    return {
      supplier: mapFilmSupplierEntity(supplier),
      purchases,
      formatStats: [...statsByFormat.values()]
        .map((row): FilmSupplierFormatStats => ({
          filmFormat: mapFilmFormatEntity(row.filmFormat),
          purchaseCount: row.purchaseCount,
          totalUnitsPurchased: row.totalUnitsPurchased,
          packagePriceByCurrency: [...row.packagePricesByCurrency.entries()].map(([currencyCode, values]) => ({
            currencyCode,
            averageAmount: average(values) ?? 0,
            medianAmount: median(values) ?? 0
          })),
          unitPriceByCurrency: [...row.unitPricesByCurrency.entries()].map(([currencyCode, values]) => ({
            currencyCode,
            averageAmount: average(values) ?? 0,
            medianAmount: median(values) ?? 0
          })),
          lastPurchaseDate: row.lastPurchaseDate
        }))
        .sort((a, b) => b.purchaseCount - a.purchaseCount || a.filmFormat.label.localeCompare(b.filmFormat.label))
    };
  }

  async findByName(userId: number, name: string): Promise<FilmSupplier | null> {
    const normalizedName = normalizeReferenceValue(name);
    if (!normalizedName) {
      return null;
    }
    const entity = await this.entityManager.findOne(FilmSupplierEntity, { user: userId, normalizedName }, { populate: ['user'] });
    return entity ? mapFilmSupplierEntity(entity) : null;
  }

  async create(userId: number, input: CreateFilmSupplierRequest): Promise<FilmSupplier> {
    const name = sanitizeReferenceValue(input.name);
    const entity = this.entityManager.create(FilmSupplierEntity, {
      user: this.entityManager.getReference(UserEntity, userId),
      name,
      normalizedName: normalizeReferenceValue(name),
      contact: input.contact ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      notes: input.notes ?? null,
      active: true,
      rating: input.rating ?? null
    });
    this.entityManager.persist(entity);
    await this.entityManager.flush();
    return mapFilmSupplierEntity(entity);
  }

  async update(userId: number, supplierId: number, input: UpdateFilmSupplierRequest): Promise<FilmSupplier | null> {
    const entity = await this.entityManager.findOne(FilmSupplierEntity, { id: supplierId, user: userId }, { populate: ['user'] });
    if (!entity) {
      return null;
    }

    if (input.name !== undefined) {
      const name = sanitizeReferenceValue(input.name);
      entity.name = name;
      entity.normalizedName = normalizeReferenceValue(name);
    }
    if (input.contact !== undefined) entity.contact = input.contact ?? null;
    if (input.email !== undefined) entity.email = input.email ?? null;
    if (input.website !== undefined) entity.website = input.website ?? null;
    if (input.notes !== undefined) entity.notes = input.notes ?? null;
    if (input.active !== undefined) entity.active = input.active;
    if (input.rating !== undefined) entity.rating = input.rating ?? null;

    await this.entityManager.flush();
    return mapFilmSupplierEntity(entity);
  }
}

function getFormatStatsRow(
  rows: Map<number, {
    filmFormat: FilmLotEntity['filmFormat'];
    purchaseCount: number;
    totalUnitsPurchased: number;
    packagePricesByCurrency: Map<string, number[]>;
    unitPricesByCurrency: Map<string, number[]>;
    lastPurchaseDate: string | null;
  }>,
  lot: FilmLotEntity
) {
  const key = lot.filmFormat.id;
  const existing = rows.get(key);
  if (existing) return existing;
  const row = {
    filmFormat: lot.filmFormat,
    purchaseCount: 0,
    totalUnitsPurchased: 0,
    packagePricesByCurrency: new Map<string, number[]>(),
    unitPricesByCurrency: new Map<string, number[]>(),
    lastPurchaseDate: null
  };
  rows.set(key, row);
  return row;
}

function laterIso(current: string | null, candidate: string): string {
  if (!current) return candidate;
  const currentTs = Date.parse(current);
  const candidateTs = Date.parse(candidate);
  if (Number.isNaN(candidateTs)) return current;
  if (Number.isNaN(currentTs)) return candidate;
  return candidateTs > currentTs ? candidate : current;
}

