/**
 * seed-demo.ts
 *
 * Generates ~215 realistic film rolls/sheets across 30 lots spanning 2 years
 * for the demo user. Safe to re-run — exits early if the user already has lots.
 *
 * Run: pnpm --filter @frollz2/api db:seed-demo
 */

import type { EntityManager } from '@mikro-orm/core';
import { MikroORM } from '@mikro-orm/core';
import { pathToFileURL } from 'node:url';
import ormConfig from './mikro-orm.config.js';
import {
  CameraEntity,
  DeviceTypeEntity,
  EmulsionEntity,
  FilmDeviceEntity,
  FilmEntity,
  FilmFormatEntity,
  FilmFrameEntity,
  FilmJourneyEventEntity,
  FilmLabEntity,
  FilmLotEntity,
  FilmStateEntity,
  FilmSupplierEntity,
  PackageTypeEntity,
  StorageLocationEntity,
  UserEntity,
} from './entities/index.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function hash(n: number): number {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return Math.abs(x ^ (x >>> 16));
}

function jitter(seed: number, min: number, max: number): number {
  return min + (hash(seed) % (max - min + 1));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const NOW = new Date('2026-05-07T12:00:00.000Z');

function cap(date: Date): Date {
  return date > NOW ? NOW : date;
}

function iso(date: Date): string {
  return cap(date).toISOString();
}

function normalize(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// ── Reference maps ───────────────────────────────────────────────────────────

interface Refs {
  emulsions:  Map<string, EmulsionEntity>;       // 'Manufacturer|Brand|ISO'
  formats:    Map<string, FilmFormatEntity>;      // '35mm'
  pkgTypes:   Map<string, PackageTypeEntity>;     // '36exp|35mm'
  states:     Map<string, FilmStateEntity>;       // 'purchased'
  locations:  Map<string, StorageLocationEntity>; // 'refrigerator'
  devTypes:   Map<string, DeviceTypeEntity>;      // 'camera'
}

async function loadRefs(em: EntityManager): Promise<Refs> {
  const [emulsionList, formatList, pkgList, stateList, locList, devTypeList] = await Promise.all([
    em.find(EmulsionEntity, {}),
    em.find(FilmFormatEntity, {}),
    em.find(PackageTypeEntity, {}, { populate: ['filmFormat'] }),
    em.find(FilmStateEntity, {}),
    em.find(StorageLocationEntity, {}),
    em.find(DeviceTypeEntity, {}),
  ]);
  return {
    emulsions: new Map(emulsionList.map(e => [`${e.manufacturer}|${e.brand}|${e.isoSpeed}`, e])),
    formats:   new Map(formatList.map(f => [f.code, f])),
    pkgTypes:  new Map(pkgList.map(p => [`${p.code}|${p.filmFormat.code}`, p])),
    states:    new Map(stateList.map(s => [s.code, s])),
    locations: new Map(locList.map(l => [l.code, l])),
    devTypes:  new Map(devTypeList.map(d => [d.code, d])),
  };
}

// ── State assignment ─────────────────────────────────────────────────────────

const STATE_ORDER = [
  'purchased', 'stored', 'loaded', 'exposed', 'removed',
  'sent_for_dev', 'developed', 'scanned', 'archived',
];

function stateIdx(code: string): number {
  return STATE_ORDER.indexOf(code);
}

// Cap simultaneous loaded/exposed films per format so cameras aren't double-booked.
let active35mm = 0;
let active120  = 0;
const MAX_ACTIVE = 2;

function assignFinalState(ageMonths: number, ratio: number, fmt: string): string {
  let raw: string;

  if (ageMonths > 18) {
    raw = ratio < 0.85 ? 'archived' : 'scanned';
  } else if (ageMonths > 12) {
    if      (ratio < 0.50) raw = 'archived';
    else if (ratio < 0.85) raw = 'scanned';
    else                   raw = 'developed';
  } else if (ageMonths > 8) {
    if      (ratio < 0.20) raw = 'archived';
    else if (ratio < 0.60) raw = 'scanned';
    else if (ratio < 0.90) raw = 'developed';
    else                   raw = 'sent_for_dev';
  } else if (ageMonths > 5) {
    if      (ratio < 0.10) raw = 'scanned';
    else if (ratio < 0.40) raw = 'developed';
    else if (ratio < 0.70) raw = 'sent_for_dev';
    else if (ratio < 0.85) raw = 'removed';
    else                   raw = 'exposed';
  } else if (ageMonths > 2) {
    if      (ratio < 0.10) raw = 'developed';
    else if (ratio < 0.25) raw = 'sent_for_dev';
    else if (ratio < 0.50) raw = 'removed';
    else if (ratio < 0.70) raw = 'exposed';
    else if (ratio < 0.85) raw = 'loaded';
    else                   raw = 'stored';
  } else {
    if      (ratio < 0.15) raw = 'exposed';
    else if (ratio < 0.35) raw = 'loaded';
    else if (ratio < 0.70) raw = 'stored';
    else                   raw = 'purchased';
  }

  // Downgrade if active camera slots are exhausted
  if (raw === 'loaded' || raw === 'exposed') {
    if (fmt === '35mm') {
      if (active35mm >= MAX_ACTIVE) return 'removed';
      active35mm++;
    } else if (fmt === '120') {
      if (active120 >= MAX_ACTIVE) return 'removed';
      active120++;
    }
  }

  return raw;
}

// ── Event builder ─────────────────────────────────────────────────────────────

const SCANNERS = [
  'Epson V600', 'Nikon Coolscan V ED', 'Plustek OpticFilm 8100', 'Epson V850', 'Noritsu HS-1800',
];
const APERTURES = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16];
const SHUTTERS  = [1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4];

interface EventSpec {
  stateCode: string;
  occurredAt: string;
  notes: string | null;
  eventData: Record<string, unknown>;
}

function buildEvents(
  purchaseDate: Date,
  finalState: string,
  lotIdx: number,
  filmIdx: number,
  cameraDeviceId: number,
  labId: number,
  labName: string,
  locationId: number,
  locationCode: string,
): EventSpec[] {
  const s = lotIdx * 100 + filmIdx;
  const events: EventSpec[] = [];

  events.push({ stateCode: 'purchased', occurredAt: iso(purchaseDate), notes: null, eventData: {} });
  if (finalState === 'purchased') return events;

  // Optional refrigerator storage step before loading
  const includeStoredStep = finalState !== 'stored' && filmIdx % 3 === 0;
  if (finalState === 'stored' || includeStoredStep) {
    const storedAt = addDays(purchaseDate, jitter(s + 1, 1, 5));
    events.push({
      stateCode: 'stored',
      occurredAt: iso(storedAt),
      notes: null,
      eventData: { storageLocationId: locationId, storageLocationCode: locationCode },
    });
    if (finalState === 'stored') return events;
  }

  // Loaded
  const prevDate = new Date(events.at(-1)!.occurredAt);
  const loadedAt = addDays(prevDate, jitter(s + 2, 2, 10));
  events.push({
    stateCode: 'loaded',
    occurredAt: iso(loadedAt),
    notes: null,
    eventData: { loadTargetType: 'camera_direct', cameraId: cameraDeviceId, intendedPushPull: null },
  });
  if (finalState === 'loaded') return events;

  // Exposed
  const exposedAt = addDays(loadedAt, jitter(s + 3, 14, 45));
  events.push({ stateCode: 'exposed', occurredAt: iso(exposedAt), notes: null, eventData: {} });
  if (finalState === 'exposed') return events;

  // Removed (same day or next day)
  const removedAt = addDays(exposedAt, jitter(s + 4, 0, 2));
  events.push({ stateCode: 'removed', occurredAt: iso(removedAt), notes: null, eventData: {} });
  if (finalState === 'removed') return events;

  // Sent for development
  const sentAt = addDays(removedAt, jitter(s + 5, 1, 7));
  const devCost = jitter(s + 11, 12, 28);
  events.push({
    stateCode: 'sent_for_dev',
    occurredAt: iso(sentAt),
    notes: null,
    eventData: {
      labId,
      labName,
      labContact: null,
      actualPushPull: null,
      cost: { amount: devCost, currencyCode: 'USD' },
    },
  });
  if (finalState === 'sent_for_dev') return events;

  // Developed
  const devAt = addDays(sentAt, jitter(s + 6, 7, 21));
  events.push({
    stateCode: 'developed',
    occurredAt: iso(devAt),
    notes: null,
    eventData: { labId, labName, actualPushPull: null },
  });
  if (finalState === 'developed') return events;

  // Scanned
  const scanAt = addDays(devAt, jitter(s + 7, 1, 14));
  const scanner = SCANNERS[hash(s + 8) % SCANNERS.length];
  events.push({
    stateCode: 'scanned',
    occurredAt: iso(scanAt),
    notes: null,
    eventData: { scannerOrSoftware: scanner, scanLink: null },
  });
  if (finalState === 'scanned') return events;

  // Archived
  const archivedAt = addDays(scanAt, jitter(s + 9, 7, 30));
  events.push({ stateCode: 'archived', occurredAt: iso(archivedAt), notes: null, eventData: {} });

  return events;
}

// ── Frame helpers ─────────────────────────────────────────────────────────────

function getFrameCount(pkgCode: string): number {
  if (pkgCode === '36exp')    return 36;
  if (pkgCode === '24exp')    return 24;
  if (pkgCode === '120_roll') return 12; // 6×6
  return 1;
}

// ── Static data definitions ───────────────────────────────────────────────────

const SUPPLIER_DEFS = [
  { key: 'bhphoto',       name: 'B&H Photo Video',        website: 'https://bhphotovideo.com',        email: 'customerservice@bhphoto.com', rating: 5 },
  { key: 'adorama',       name: 'Adorama Camera',          website: 'https://adorama.com',             email: null,                          rating: 4 },
  { key: 'filmphotostore',name: 'Film Photography Store',  website: 'https://filmphotographystore.com', email: null,                         rating: 5 },
  { key: 'amazon',        name: 'Amazon',                  website: 'https://amazon.com',              email: null,                          rating: 3 },
] as const;

const LAB_DEFS = [
  { key: 'darkroom', name: 'The Darkroom',      website: 'https://thedarkroom.com',       email: 'mail@thedarkroom.com',   processes: 'C41,BW,E6',      rating: 5 },
  { key: 'richard',  name: 'Richard Photo Lab', website: 'https://richardphotolab.com',   email: null,                     processes: 'C41,BW,E6,ECN2', rating: 5 },
  { key: 'indie',    name: 'Indie Film Lab',    website: 'https://indiefilmlab.com',      email: null,                     processes: 'C41,BW',          rating: 4 },
  { key: 'local',    name: 'Local Color Lab',   website: null,                            email: 'info@localcolorlab.com', processes: 'C41,BW',          rating: 4 },
] as const;

// Camera index layout after creation:
//   [0] Nikon F3 HP       35mm  — historical reference
//   [1] Olympus OM-1n     35mm  — active slot A  (currently loaded/exposed)
//   [2] Pentax K1000      35mm  — active slot B  (currently loaded/exposed)
//   [3] Mamiya C330 f     120   — historical reference
//   [4] Yashica Mat 124G  120   — active slot A
//   [5] Mamiya RB67 Pro-S 120   — active slot B
const CAMERA_DEFS = [
  { fmt: '35mm', fs: 'full_frame', make: 'Nikon',   model: 'F3 HP',       acquired: '2022-03-15' },
  { fmt: '35mm', fs: 'full_frame', make: 'Olympus', model: 'OM-1n',       acquired: '2021-08-10' },
  { fmt: '35mm', fs: 'full_frame', make: 'Pentax',  model: 'K1000',       acquired: '2023-01-20' },
  { fmt: '120',  fs: '6x6',        make: 'Mamiya',  model: 'C330 f',      acquired: '2022-06-05' },
  { fmt: '120',  fs: '6x6',        make: 'Yashica', model: 'Mat 124G',    acquired: '2023-11-12' },
  { fmt: '120',  fs: '6x6',        make: 'Mamiya',  model: 'RB67 Pro-S',  acquired: '2024-02-28' },
] as const;

interface LotDef {
  emul:    [string, string, number]; // [manufacturer, brand, isoSpeed]
  fmt:     string;
  pkg:     string;
  qty:     number;
  date:    string; // purchase date YYYY-MM-DD
  supp:    string;
  price:   number;
  exp:     string; // expiration date YYYY-MM-DD
  channel?: string;
  rating?: number;
}

// 30 lots, ~215 total rolls/sheets spanning May 2024 – May 2026
const LOT_DEFS: LotDef[] = [
  // ── 2024 lots (>18 months old → mostly archived) ──────────────────────────
  { emul:['Kodak','Portra',400],    fmt:'35mm', pkg:'36exp',    qty:10, date:'2024-05-15', supp:'bhphoto',       price:179.90, exp:'2026-01-01', rating:5 },
  { emul:['Ilford','HP5 Plus',400], fmt:'35mm', pkg:'36exp',    qty:10, date:'2024-06-01', supp:'bhphoto',       price:149.90, exp:'2026-06-01', rating:4 },
  { emul:['Kodak','Portra',400],    fmt:'35mm', pkg:'24exp',    qty: 5, date:'2024-06-20', supp:'amazon',        price: 89.95, exp:'2026-01-01', channel:'online' },
  { emul:['Kodak','Gold',200],      fmt:'35mm', pkg:'36exp',    qty:10, date:'2024-07-10', supp:'amazon',        price: 89.90, exp:'2025-12-01', channel:'online', rating:3 },
  { emul:['Kodak','Portra',400],    fmt:'120',  pkg:'120_roll', qty:10, date:'2024-08-20', supp:'bhphoto',       price:149.90, exp:'2026-03-01', rating:5 },
  { emul:['Fujifilm','Velvia',50],  fmt:'35mm', pkg:'36exp',    qty: 5, date:'2024-09-01', supp:'adorama',       price: 89.75, exp:'2026-01-01', rating:5 },
  { emul:['Kodak','Ektar',100],     fmt:'35mm', pkg:'36exp',    qty:10, date:'2024-10-15', supp:'bhphoto',       price:149.90, exp:'2026-06-01', rating:4 },
  { emul:['Ilford','HP5 Plus',400], fmt:'120',  pkg:'120_roll', qty: 5, date:'2024-11-01', supp:'filmphotostore',price: 74.75, exp:'2026-09-01', rating:4 },
  { emul:['Kodak','Tri-X',400],     fmt:'35mm', pkg:'36exp',    qty:10, date:'2024-12-10', supp:'bhphoto',       price:149.90, exp:'2026-06-01', rating:4 },
  // ── Early 2025 (12–18 months → scanned/archived) ──────────────────────────
  { emul:['Ilford','HP5 Plus',400], fmt:'35mm', pkg:'36exp',    qty:10, date:'2025-01-01', supp:'bhphoto',       price:149.90, exp:'2027-01-01', rating:4 },
  { emul:['CineStill','800T',800],  fmt:'35mm', pkg:'36exp',    qty: 5, date:'2025-01-15', supp:'adorama',       price: 99.75, exp:'2027-01-01', rating:4 },
  { emul:['Kodak','Gold',200],      fmt:'35mm', pkg:'36exp',    qty:10, date:'2025-02-20', supp:'amazon',        price: 89.90, exp:'2026-06-01', channel:'online', rating:3 },
  { emul:['Kodak','Portra',400],    fmt:'35mm', pkg:'36exp',    qty:10, date:'2025-03-01', supp:'bhphoto',       price:179.90, exp:'2027-01-01', rating:5 },
  { emul:['Fujifilm','Provia',100], fmt:'35mm', pkg:'36exp',    qty: 5, date:'2025-04-10', supp:'adorama',       price: 79.75, exp:'2027-01-01', rating:4 },
  { emul:['Ilford','Delta',100],    fmt:'35mm', pkg:'36exp',    qty: 5, date:'2025-05-15', supp:'filmphotostore',price: 69.75, exp:'2027-01-01', rating:4 },
  { emul:['CineStill','800T',800],  fmt:'120',  pkg:'120_roll', qty: 5, date:'2025-05-01', supp:'adorama',       price:124.75, exp:'2027-01-01', rating:5 },
  // ── Mid 2025 (8–12 months → developed/scanned) ────────────────────────────
  { emul:['Kodak','Portra',400],    fmt:'120',  pkg:'120_roll', qty:10, date:'2025-06-01', supp:'bhphoto',       price:149.90, exp:'2027-06-01', rating:5 },
  { emul:['Fujifilm','Provia',100], fmt:'120',  pkg:'120_roll', qty: 5, date:'2025-07-01', supp:'adorama',       price: 84.75, exp:'2027-01-01', rating:4 },
  { emul:['Kodak','Ektar',100],     fmt:'120',  pkg:'120_roll', qty: 5, date:'2025-07-10', supp:'bhphoto',       price: 84.75, exp:'2027-01-01', rating:4 },
  // ── Late 2025 (5–8 months → removed/sent_for_dev) ─────────────────────────
  { emul:['Ilford','HP5 Plus',400], fmt:'35mm', pkg:'36exp',    qty:10, date:'2025-08-20', supp:'bhphoto',       price:149.90, exp:'2027-06-01', rating:5 },
  { emul:['Kodak','Tri-X',400],     fmt:'120',  pkg:'120_roll', qty: 5, date:'2025-09-01', supp:'adorama',       price: 74.75, exp:'2027-01-01', rating:4 },
  { emul:['Kodak','Tri-X',400],     fmt:'35mm', pkg:'36exp',    qty: 5, date:'2025-09-15', supp:'filmphotostore',price: 74.75, exp:'2027-01-01', rating:4 },
  { emul:['Fujifilm','Velvia',50],  fmt:'120',  pkg:'120_roll', qty: 5, date:'2025-10-15', supp:'bhphoto',       price: 84.75, exp:'2027-06-01', rating:5 },
  { emul:['CineStill','800T',800],  fmt:'35mm', pkg:'36exp',    qty: 5, date:'2025-11-01', supp:'adorama',       price: 99.75, exp:'2027-06-01', rating:4 },
  // ── Dec 2025 (4–5 months → recently removed/stored) ──────────────────────
  { emul:['Kodak','Portra',400],    fmt:'35mm', pkg:'36exp',    qty:10, date:'2025-12-10', supp:'bhphoto',       price:179.90, exp:'2028-01-01', rating:5 },
  // ── 2026 lots (very recent → stored/purchased/active) ─────────────────────
  { emul:['Kodak','Gold',200],      fmt:'35mm', pkg:'36exp',    qty:10, date:'2026-01-15', supp:'amazon',        price: 89.90, exp:'2027-06-01', channel:'online', rating:3 },
  { emul:['Ilford','HP5 Plus',400], fmt:'120',  pkg:'120_roll', qty: 5, date:'2026-02-20', supp:'filmphotostore',price: 74.75, exp:'2028-01-01', rating:4 },
  { emul:['Kodak','Portra',400],    fmt:'35mm', pkg:'36exp',    qty: 5, date:'2026-03-01', supp:'bhphoto',       price: 89.95, exp:'2028-01-01', rating:5 },
  { emul:['Kodak','Ektar',100],     fmt:'35mm', pkg:'36exp',    qty: 5, date:'2026-04-10', supp:'bhphoto',       price: 74.75, exp:'2028-01-01', rating:4 },
  { emul:['Kodak','Portra',400],    fmt:'120',  pkg:'120_roll', qty: 5, date:'2026-05-01', supp:'bhphoto',       price: 74.95, exp:'2028-06-01', rating:5 },
];

// ── Main seeder ───────────────────────────────────────────────────────────────

export async function seedDemoData(orm: MikroORM): Promise<void> {
  const em = orm.em.fork();

  // Find demo user
  const userEmail = (process.env['TEST_USER_EMAIL'] ?? 'demo@example.com').toLowerCase().trim();
  const user = await em.findOne(UserEntity, { email: userEmail });
  if (!user) {
    console.log(`Demo user "${userEmail}" not found — run db:seed first.`);
    return;
  }

  // Idempotency guard — skip only if it looks like the full demo set is already there
  const existingLots = await em.count(FilmLotEntity, { user: user.id });
  if (existingLots >= LOT_DEFS.length) {
    console.log(`Demo data already present (${existingLots} lots). Skipping.`);
    return;
  }

  const refs = await loadRefs(em);

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const supplierMap = new Map<string, FilmSupplierEntity>();
  for (const def of SUPPLIER_DEFS) {
    const normalizedName = normalize(def.name);
    let supplier = await em.findOne(FilmSupplierEntity, { user: user.id, normalizedName });
    if (!supplier) {
      supplier = em.create(FilmSupplierEntity, {
        user, name: def.name, normalizedName,
        contact: null, email: def.email ?? null, website: def.website ?? null,
        notes: null, active: true, rating: def.rating,
      });
      em.persist(supplier);
    }
    supplierMap.set(def.key, supplier);
  }
  await em.flush();

  // ── Labs ──────────────────────────────────────────────────────────────────
  const labMap = new Map<string, FilmLabEntity>();
  for (const def of LAB_DEFS) {
    const normalizedName = normalize(def.name);
    let lab = await em.findOne(FilmLabEntity, { user: user.id, normalizedName });
    if (!lab) {
      lab = em.create(FilmLabEntity, {
        user, name: def.name, normalizedName,
        contact: null, email: def.email ?? null, website: def.website ?? null,
        defaultProcesses: def.processes, notes: null, active: true, rating: def.rating,
      });
      em.persist(lab);
    }
    labMap.set(def.key, lab);
  }
  await em.flush();

  // ── Cameras ───────────────────────────────────────────────────────────────
  const cameraType = refs.devTypes.get('camera');
  if (!cameraType) throw new Error('Device type "camera" not found — run db:seed first.');

  const cameraDevices: FilmDeviceEntity[] = [];
  for (const def of CAMERA_DEFS) {
    const format = refs.formats.get(def.fmt);
    if (!format) throw new Error(`Film format "${def.fmt}" not found.`);

    const device = em.create(FilmDeviceEntity, {
      user, deviceType: cameraType, filmFormat: format, frameSize: def.fs,
    });
    em.persist(device);
    await em.flush();

    em.persist(em.create(CameraEntity, {
      filmDevice: device,
      make: def.make,
      model: def.model,
      loadMode: 'direct',
      canUnload: true,
      cameraSystem: null,
      serialNumber: null,
      dateAcquired: new Date(def.acquired + 'T12:00:00.000Z').toISOString(),
    }));
    await em.flush();

    cameraDevices.push(device);
  }

  // Pick camera for a film:
  //   historical (non-active) → [0]=35mm, [3]=120
  //   active slot 0           → [1]=35mm, [4]=120
  //   active slot 1           → [2]=35mm, [5]=120
  function pickCamera(fmt: string, isActive: boolean, activeSlot: number): FilmDeviceEntity {
    if (fmt === '35mm') return cameraDevices[isActive ? 1 + activeSlot : 0]!;
    return cameraDevices[isActive ? 4 + activeSlot : 3]!;
  }

  // ── Storage location ──────────────────────────────────────────────────────
  const fridgeLoc = refs.locations.get('refrigerator');
  if (!fridgeLoc) throw new Error('Storage location "refrigerator" not found.');

  const labKeys = ['darkroom', 'richard', 'indie', 'local'] as const;
  const labs = labKeys.map(k => labMap.get(k)!);

  // ── Process lots ──────────────────────────────────────────────────────────
  let rollCounter = 0;
  let totalFrames = 0;

  for (const [lotIdx, def] of LOT_DEFS.entries()) {
    const purchaseDate = new Date(def.date + 'T10:00:00.000Z');
    const ageMonths = (NOW.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

    const emulKey = `${def.emul[0]}|${def.emul[1]}|${def.emul[2]}`;
    const emulsion = refs.emulsions.get(emulKey);
    if (!emulsion) throw new Error(`Emulsion not found: ${emulKey}`);

    const format = refs.formats.get(def.fmt);
    if (!format) throw new Error(`Format not found: ${def.fmt}`);

    const pkgKey = `${def.pkg}|${def.fmt}`;
    const pkgType = refs.pkgTypes.get(pkgKey);
    if (!pkgType) throw new Error(`Package type not found: ${pkgKey}`);

    const supplier = supplierMap.get(def.supp);
    if (!supplier) throw new Error(`Supplier not found: ${def.supp}`);

    const lot = em.create(FilmLotEntity, {
      user, emulsion, packageType: pkgType, filmFormat: format,
      quantity: def.qty,
      expirationDate: new Date(def.exp + 'T00:00:00.000Z').toISOString(),
      supplier,
      purchaseInfo: {
        channel: def.channel ?? 'online',
        price: def.price,
        currencyCode: 'USD',
        obtainedDate: purchaseDate.toISOString(),
      },
      rating: def.rating ?? null,
      createdAt: purchaseDate.toISOString(),
    });
    em.persist(lot);
    await em.flush();

    for (let filmIdx = 0; filmIdx < def.qty; filmIdx++) {
      rollCounter++;
      const ratio = filmIdx / def.qty;
      const finalState = assignFinalState(ageMonths, ratio, def.fmt);
      const isActive = finalState === 'loaded' || finalState === 'exposed';

      // Determine which camera slot this film uses
      let activeSlot = 0;
      if (isActive) {
        // active35mm / active120 was already incremented inside assignFinalState
        const count = def.fmt === '35mm' ? active35mm : active120;
        activeSlot = (count - 1) % MAX_ACTIVE;
      }
      const camera = pickCamera(def.fmt, isActive, activeSlot);

      const lab = labs[hash(lotIdx * 100 + filmIdx) % labs.length]!;

      const filmName = `Roll #${String(rollCounter).padStart(3, '0')}`;

      const finalStateEntity = refs.states.get(finalState)!;

      const film = em.create(FilmEntity, {
        user, filmLot: lot, name: filmName, emulsion,
        packageType: pkgType, filmFormat: format,
        expirationDate: new Date(def.exp + 'T00:00:00.000Z').toISOString(),
        currentState: finalStateEntity,
        currentDevice: isActive ? camera : null,
      });
      em.persist(film);
      await em.flush();

      // Journey events
      const eventSpecs = buildEvents(
        purchaseDate, finalState, lotIdx, filmIdx,
        camera.id, lab.id, lab.name,
        fridgeLoc.id, fridgeLoc.code,
      );
      for (const spec of eventSpecs) {
        em.persist(em.create(FilmJourneyEventEntity, {
          film, user,
          filmState: refs.states.get(spec.stateCode)!,
          occurredAt: spec.occurredAt,
          recordedAt: spec.occurredAt,
          notes: spec.notes,
          eventData: spec.eventData,
        }));
      }
      await em.flush();

      // Frames (created when film was loaded into a camera)
      if (stateIdx(finalState) >= stateIdx('loaded')) {
        const fc = getFrameCount(def.pkg);
        const hasExposureData = stateIdx(finalState) >= stateIdx('exposed');
        for (let fnum = 1; fnum <= fc; fnum++) {
          const fSeed = lotIdx * 10000 + filmIdx * 100 + fnum;
          em.persist(em.create(FilmFrameEntity, {
            user, film,
            frameNumber: fnum,
            currentState: finalStateEntity,
            aperture:          hasExposureData ? APERTURES[hash(fSeed)     % APERTURES.length]! : null,
            shutterSpeedSeconds: hasExposureData ? SHUTTERS [hash(fSeed + 1) % SHUTTERS.length]!  : null,
            filterUsed: null,
          }));
        }
        totalFrames += fc;
        await em.flush();
      }
    }

    process.stdout.write(`  Lot ${String(lotIdx + 1).padStart(2, '0')}/${LOT_DEFS.length} — ${def.emul[0]} ${def.emul[1]} ${def.fmt} ×${def.qty}\n`);
  }

  console.log(`\n✓ Demo seed complete:`);
  console.log(`  ${rollCounter} films across ${LOT_DEFS.length} lots`);
  console.log(`  ${totalFrames} frames`);
  console.log(`  ${supplierMap.size} suppliers, ${labMap.size} labs, ${cameraDevices.length} cameras`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const orm = await MikroORM.init(ormConfig);
  try {
    await seedDemoData(orm);
  } finally {
    await orm.close(true);
  }
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMain) {
  void main();
}
