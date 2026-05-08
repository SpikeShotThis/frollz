/**
 * seed-demo-ext.ts
 *
 * Extends the demo dataset with:
 *   ~80 additional 35mm/120 rolls  (Roll  #216 – #295)
 *   ~125 large-format sheet films  (Sheet #001 – #125)
 * and 5 film-holder devices (3×4x5, 1×5x7, 1×8x10).
 *
 * Must be run AFTER db:seed and db:seed-demo.
 * Safe to re-run — skips if extension lots are already present.
 *
 * Run: pnpm --filter @frollz2/api db:seed-demo-ext
 */

import type { EntityManager } from '@mikro-orm/core';
import { MikroORM } from '@mikro-orm/core';
import { pathToFileURL } from 'node:url';
import ormConfig from './mikro-orm.config.js';
import {
  DeviceTypeEntity,
  EmulsionEntity,
  FilmDeviceEntity,
  FilmEntity,
  FilmFormatEntity,
  FilmFrameEntity,
  FilmHolderEntity,
  FilmHolderSlotEntity,
  FilmJourneyEventEntity,
  FilmLabEntity,
  FilmLotEntity,
  FilmStateEntity,
  FilmSupplierEntity,
  HolderTypeEntity,
  PackageTypeEntity,
  SlotStateEntity,
  StorageLocationEntity,
  UserEntity,
} from './entities/index.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function cap(date: Date): Date { return date > NOW ? NOW : date; }
function iso(date: Date): string { return cap(date).toISOString(); }

// ── Ref loading ───────────────────────────────────────────────────────────────

interface Refs {
  emulsions:   Map<string, EmulsionEntity>;
  formats:     Map<string, FilmFormatEntity>;
  pkgTypes:    Map<string, PackageTypeEntity>;
  states:      Map<string, FilmStateEntity>;
  locations:   Map<string, StorageLocationEntity>;
  devTypes:    Map<string, DeviceTypeEntity>;
  holderTypes: Map<string, HolderTypeEntity>;
  slotStates:  Map<string, SlotStateEntity>;
}

async function loadRefs(em: EntityManager): Promise<Refs> {
  const [emulsionList, formatList, pkgList, stateList, locList, devTypeList, holderTypeList, slotStateList] = await Promise.all([
    em.find(EmulsionEntity, {}),
    em.find(FilmFormatEntity, {}),
    em.find(PackageTypeEntity, {}, { populate: ['filmFormat'] }),
    em.find(FilmStateEntity, {}),
    em.find(StorageLocationEntity, {}),
    em.find(DeviceTypeEntity, {}),
    em.find(HolderTypeEntity, {}),
    em.find(SlotStateEntity, {}),
  ]);
  return {
    emulsions:   new Map(emulsionList.map(e => [`${e.manufacturer}|${e.brand}|${e.isoSpeed}`, e])),
    formats:     new Map(formatList.map(f => [f.code, f])),
    pkgTypes:    new Map(pkgList.map(p => [`${p.code}|${p.filmFormat.code}`, p])),
    states:      new Map(stateList.map(s => [s.code, s])),
    locations:   new Map(locList.map(l => [l.code, l])),
    devTypes:    new Map(devTypeList.map(d => [d.code, d])),
    holderTypes: new Map(holderTypeList.map(h => [h.code, h])),
    slotStates:  new Map(slotStateList.map(s => [s.code, s])),
  };
}

// ── State assignment ──────────────────────────────────────────────────────────

const STATE_ORDER = [
  'purchased', 'stored', 'loaded', 'exposed', 'removed',
  'sent_for_dev', 'developed', 'scanned', 'archived',
];

function stateIdx(code: string): number { return STATE_ORDER.indexOf(code); }

// The original seed-demo already filled all 35mm/120 camera slots (2 each).
// LF holders are new; allow up to 4 active 4x5, 2 active 5x7, 1 active 8x10.
let active4x5  = 0;
let active5x7  = 0;
let active8x10 = 0;
const MAX_4x5  = 4;
const MAX_5x7  = 2;
const MAX_8x10 = 1;

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

  // 35mm/120 camera slots already full from original seed
  if ((fmt === '35mm' || fmt === '120') && (raw === 'loaded' || raw === 'exposed')) {
    return 'removed';
  }

  if (raw === 'loaded' || raw === 'exposed') {
    if (fmt === '4x5') {
      if (active4x5 >= MAX_4x5) return 'removed';
      active4x5++;
    } else if (fmt === '5x7') {
      if (active5x7 >= MAX_5x7) return 'removed';
      active5x7++;
    } else if (fmt === '8x10') {
      if (active8x10 >= MAX_8x10) return 'removed';
      active8x10++;
    }
  }

  return raw;
}

// ── Holder slot tracking ──────────────────────────────────────────────────────

interface HolderRecord {
  device: FilmDeviceEntity;
  entity: FilmHolderEntity;
}

// deviceId → [slot1_available, slot2_available]
const holderSlotAvail = new Map<number, [boolean, boolean]>();

function claimHolderSlot(holders: HolderRecord[]): { device: FilmDeviceEntity; entity: FilmHolderEntity; slotNumber: number } | null {
  for (const h of holders) {
    const avail = holderSlotAvail.get(h.device.id) ?? ([true, true] as [boolean, boolean]);
    const idx   = avail.indexOf(true);
    if (idx !== -1) {
      avail[idx] = false;
      holderSlotAvail.set(h.device.id, avail);
      return { device: h.device, entity: h.entity, slotNumber: idx + 1 };
    }
  }
  return null;
}

// ── Event builders ────────────────────────────────────────────────────────────

const SCANNERS = [
  'Epson V600', 'Nikon Coolscan V ED', 'Plustek OpticFilm 8100', 'Epson V850', 'Noritsu HS-1800',
];
const APERTURES = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22, 32];
const SHUTTERS  = [1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2, 1];

interface EventSpec {
  stateCode:  string;
  occurredAt: string;
  notes:      string | null;
  eventData:  Record<string, unknown>;
}

// High base offsets to avoid seed collisions with seed-demo.ts
const ROLL_SEED_BASE  = 50_000;
const SHEET_SEED_BASE = 100_000;

function buildRollEvents(
  purchaseDate:   Date,
  finalState:     string,
  lotIdx:         number,
  filmIdx:        number,
  cameraDeviceId: number,
  labId:          number,
  labName:        string,
  locationId:     number,
  locationCode:   string,
): EventSpec[] {
  const s = ROLL_SEED_BASE + lotIdx * 100 + filmIdx;
  const events: EventSpec[] = [];

  events.push({ stateCode: 'purchased', occurredAt: iso(purchaseDate), notes: null, eventData: {} });
  if (finalState === 'purchased') return events;

  const includeStoredStep = finalState !== 'stored' && filmIdx % 3 === 0;
  if (finalState === 'stored' || includeStoredStep) {
    const storedAt = addDays(purchaseDate, jitter(s + 1, 1, 5));
    events.push({ stateCode: 'stored', occurredAt: iso(storedAt), notes: null, eventData: { storageLocationId: locationId, storageLocationCode: locationCode } });
    if (finalState === 'stored') return events;
  }

  const prevDate = new Date(events.at(-1)!.occurredAt);
  const loadedAt = addDays(prevDate, jitter(s + 2, 2, 10));
  events.push({ stateCode: 'loaded', occurredAt: iso(loadedAt), notes: null, eventData: { loadTargetType: 'camera_direct', cameraId: cameraDeviceId, intendedPushPull: null } });
  if (finalState === 'loaded') return events;

  const exposedAt = addDays(loadedAt, jitter(s + 3, 14, 45));
  events.push({ stateCode: 'exposed', occurredAt: iso(exposedAt), notes: null, eventData: {} });
  if (finalState === 'exposed') return events;

  const removedAt = addDays(exposedAt, jitter(s + 4, 0, 2));
  events.push({ stateCode: 'removed', occurredAt: iso(removedAt), notes: null, eventData: {} });
  if (finalState === 'removed') return events;

  const sentAt  = addDays(removedAt, jitter(s + 5, 1, 7));
  const devCost = jitter(s + 11, 12, 28);
  events.push({ stateCode: 'sent_for_dev', occurredAt: iso(sentAt), notes: null, eventData: { labId, labName, labContact: null, actualPushPull: null, cost: { amount: devCost, currencyCode: 'USD' } } });
  if (finalState === 'sent_for_dev') return events;

  const devAt = addDays(sentAt, jitter(s + 6, 7, 21));
  events.push({ stateCode: 'developed', occurredAt: iso(devAt), notes: null, eventData: { labId, labName, actualPushPull: null } });
  if (finalState === 'developed') return events;

  const scanAt  = addDays(devAt, jitter(s + 7, 1, 14));
  events.push({ stateCode: 'scanned', occurredAt: iso(scanAt), notes: null, eventData: { scannerOrSoftware: SCANNERS[hash(s + 8) % SCANNERS.length], scanLink: null } });
  if (finalState === 'scanned') return events;

  const archivedAt = addDays(scanAt, jitter(s + 9, 7, 30));
  events.push({ stateCode: 'archived', occurredAt: iso(archivedAt), notes: null, eventData: {} });
  return events;
}

function buildSheetEvents(
  purchaseDate: Date,
  finalState:   string,
  lotIdx:       number,
  filmIdx:      number,
  holderId:     number,
  slotNumber:   number,
  labId:        number,
  labName:      string,
  locationId:   number,
  locationCode: string,
): EventSpec[] {
  const s = SHEET_SEED_BASE + lotIdx * 100 + filmIdx;
  const events: EventSpec[] = [];

  events.push({ stateCode: 'purchased', occurredAt: iso(purchaseDate), notes: null, eventData: {} });
  if (finalState === 'purchased') return events;

  const includeStoredStep = finalState !== 'stored' && filmIdx % 2 === 0;
  if (finalState === 'stored' || includeStoredStep) {
    const storedAt = addDays(purchaseDate, jitter(s + 1, 1, 7));
    events.push({ stateCode: 'stored', occurredAt: iso(storedAt), notes: null, eventData: { storageLocationId: locationId, storageLocationCode: locationCode } });
    if (finalState === 'stored') return events;
  }

  const prevDate = new Date(events.at(-1)!.occurredAt);
  const loadedAt = addDays(prevDate, jitter(s + 2, 3, 20));
  events.push({
    stateCode: 'loaded',
    occurredAt: iso(loadedAt),
    notes: null,
    eventData: { loadTargetType: 'film_holder_slot', filmHolderId: holderId, slotNumber, intendedPushPull: null },
  });
  if (finalState === 'loaded') return events;

  // LF exposure can span weeks to months
  const exposedAt = addDays(loadedAt, jitter(s + 3, 3, 90));
  events.push({ stateCode: 'exposed', occurredAt: iso(exposedAt), notes: null, eventData: {} });
  if (finalState === 'exposed') return events;

  const removedAt = addDays(exposedAt, jitter(s + 4, 0, 3));
  events.push({ stateCode: 'removed', occurredAt: iso(removedAt), notes: null, eventData: {} });
  if (finalState === 'removed') return events;

  const sentAt  = addDays(removedAt, jitter(s + 5, 1, 14));
  const devCost = jitter(s + 11, 18, 40);
  events.push({ stateCode: 'sent_for_dev', occurredAt: iso(sentAt), notes: null, eventData: { labId, labName, labContact: null, actualPushPull: null, cost: { amount: devCost, currencyCode: 'USD' } } });
  if (finalState === 'sent_for_dev') return events;

  const devAt = addDays(sentAt, jitter(s + 6, 7, 28));
  events.push({ stateCode: 'developed', occurredAt: iso(devAt), notes: null, eventData: { labId, labName, actualPushPull: null } });
  if (finalState === 'developed') return events;

  const scanAt = addDays(devAt, jitter(s + 7, 3, 21));
  events.push({ stateCode: 'scanned', occurredAt: iso(scanAt), notes: null, eventData: { scannerOrSoftware: 'Epson V850', scanLink: null } });
  if (finalState === 'scanned') return events;

  const archivedAt = addDays(scanAt, jitter(s + 9, 14, 60));
  events.push({ stateCode: 'archived', occurredAt: iso(archivedAt), notes: null, eventData: {} });
  return events;
}

// ── Frame count ───────────────────────────────────────────────────────────────

function getFrameCount(pkgCode: string): number {
  if (pkgCode === '36exp')    return 36;
  if (pkgCode === '24exp')    return 24;
  if (pkgCode === '120_roll') return 12;
  return 1; // sheet formats
}

// ── Static data ───────────────────────────────────────────────────────────────

// Holders: [0-2] 4x5, [3] 5x7, [4] 8x10
const HOLDER_DEFS = [
  { fmt: '4x5',  frameSize: '4x5',  brand: 'Lisco',    name: 'Lisco 4x5 #1',        slots: 2 as const },
  { fmt: '4x5',  frameSize: '4x5',  brand: 'Fidelity', name: 'Fidelity Elite 4x5',  slots: 2 as const },
  { fmt: '4x5',  frameSize: '4x5',  brand: 'Toyo',     name: 'Toyo 4x5 #1',         slots: 2 as const },
  { fmt: '5x7',  frameSize: '5x7',  brand: 'Lisco',    name: 'Lisco 5x7 #1',        slots: 2 as const },
  { fmt: '8x10', frameSize: '8x10', brand: 'Fidelity', name: 'Fidelity Elite 8x10', slots: 2 as const },
] as const;

const SUPPLIER_KEYS = ['bhphoto', 'adorama', 'filmphotostore', 'amazon'] as const;
type SupplierKey = typeof SUPPLIER_KEYS[number];

const LAB_KEYS = ['darkroom', 'richard', 'indie', 'local'] as const;
type LabKey = typeof LAB_KEYS[number];

const SUPPLIER_NAMES: Record<SupplierKey, string> = {
  bhphoto:        'b&h photo video',
  adorama:        'adorama camera',
  filmphotostore: 'film photography store',
  amazon:         'amazon',
};

const LAB_NAMES: Record<LabKey, string> = {
  darkroom: 'the darkroom',
  richard:  'richard photo lab',
  indie:    'indie film lab',
  local:    'local color lab',
};

interface LotDef {
  emul:     [string, string, number];
  fmt:      string;
  pkg:      string;
  qty:      number;
  date:     string;
  supp:     SupplierKey;
  price:    number;
  exp:      string;
  channel?: string;
  rating?:  number;
}

// 13 additional 35mm/120 lots → 80 more rolls (Roll #216–#295)
const EXT_ROLL_DEFS: LotDef[] = [
  { emul:['Kodak','Portra',400],    fmt:'35mm', pkg:'36exp',    qty:10, date:'2024-05-20', supp:'bhphoto',        price:179.90, exp:'2026-06-01', rating:5 },
  { emul:['Fujifilm','Velvia',50],  fmt:'120',  pkg:'120_roll', qty: 5, date:'2024-07-15', supp:'adorama',        price: 84.75, exp:'2026-09-01', rating:5 },
  { emul:['Ilford','Delta',100],    fmt:'120',  pkg:'120_roll', qty: 5, date:'2024-09-10', supp:'filmphotostore', price: 69.75, exp:'2027-01-01', rating:4 },
  { emul:['Kodak','Ektar',100],     fmt:'120',  pkg:'120_roll', qty: 6, date:'2024-11-20', supp:'bhphoto',        price: 89.90, exp:'2027-01-01', rating:4 },
  { emul:['CineStill','800T',800],  fmt:'35mm', pkg:'36exp',    qty: 5, date:'2025-02-01', supp:'adorama',        price: 99.75, exp:'2027-06-01', rating:4 },
  { emul:['Fujifilm','Provia',100], fmt:'120',  pkg:'120_roll', qty: 5, date:'2025-03-15', supp:'adorama',        price: 84.75, exp:'2027-06-01', rating:4 },
  { emul:['Kodak','Gold',200],      fmt:'35mm', pkg:'36exp',    qty: 8, date:'2025-04-01', supp:'amazon',         price: 71.92, exp:'2026-12-01', channel:'online', rating:3 },
  { emul:['Ilford','HP5 Plus',400], fmt:'120',  pkg:'120_roll', qty: 5, date:'2025-05-20', supp:'filmphotostore', price: 74.75, exp:'2027-09-01', rating:4 },
  { emul:['Kodak','Tri-X',400],     fmt:'35mm', pkg:'36exp',    qty: 6, date:'2025-06-10', supp:'bhphoto',        price: 89.94, exp:'2027-06-01', rating:4 },
  { emul:['Kodak','Portra',400],    fmt:'35mm', pkg:'36exp',    qty: 8, date:'2025-07-15', supp:'bhphoto',        price:143.92, exp:'2027-06-01', rating:5 },
  { emul:['Fujifilm','Velvia',50],  fmt:'35mm', pkg:'36exp',    qty: 5, date:'2025-08-01', supp:'adorama',        price: 89.75, exp:'2027-09-01', rating:5 },
  { emul:['Ilford','Delta',100],    fmt:'35mm', pkg:'36exp',    qty: 5, date:'2025-10-10', supp:'filmphotostore', price: 69.75, exp:'2027-09-01', rating:4 },
  { emul:['Kodak','Portra',400],    fmt:'120',  pkg:'120_roll', qty: 7, date:'2025-12-15', supp:'bhphoto',        price:104.93, exp:'2028-01-01', rating:5 },
];

// 11 large-format lots → 125 sheets (Sheet #001–#125)
const EXT_SHEET_DEFS: LotDef[] = [
  // ── 4x5 — 75 sheets ─────────────────────────────────────────────────────────
  { emul:['Kodak','Portra',160],    fmt:'4x5', pkg:'25sheets', qty:25, date:'2024-06-15', supp:'bhphoto',        price:149.95, exp:'2026-09-01', rating:5 },
  { emul:['Ilford','HP5 Plus',400], fmt:'4x5', pkg:'10sheets', qty:10, date:'2024-09-01', supp:'filmphotostore', price: 49.90, exp:'2027-01-01', rating:4 },
  { emul:['Fujifilm','Velvia',50],  fmt:'4x5', pkg:'10sheets', qty:10, date:'2025-01-10', supp:'adorama',        price: 74.75, exp:'2027-01-01', rating:5 },
  { emul:['Kodak','T-Max',100],     fmt:'4x5', pkg:'10sheets', qty:10, date:'2025-04-20', supp:'bhphoto',        price: 59.90, exp:'2027-06-01', rating:4 },
  { emul:['Kodak','Portra',160],    fmt:'4x5', pkg:'10sheets', qty:10, date:'2025-08-15', supp:'bhphoto',        price: 59.90, exp:'2028-01-01', rating:5 },
  { emul:['Ilford','FP4 Plus',125], fmt:'4x5', pkg:'10sheets', qty:10, date:'2026-01-20', supp:'filmphotostore', price: 49.90, exp:'2028-06-01', rating:4 },
  // ── 5x7 — 20 sheets ─────────────────────────────────────────────────────────
  { emul:['Kodak','T-Max',100],     fmt:'5x7', pkg:'10sheets', qty:10, date:'2024-11-05', supp:'bhphoto',        price: 74.90, exp:'2026-12-01', rating:4 },
  { emul:['Ilford','FP4 Plus',125], fmt:'5x7', pkg:'10sheets', qty:10, date:'2025-07-10', supp:'filmphotostore', price: 64.90, exp:'2027-09-01', rating:4 },
  // ── 8x10 — 30 sheets ────────────────────────────────────────────────────────
  { emul:['Ilford','HP5 Plus',400], fmt:'8x10', pkg:'10sheets', qty:10, date:'2024-07-20', supp:'bhphoto',        price:119.90, exp:'2026-06-01', rating:4 },
  { emul:['Kodak','T-Max',100],     fmt:'8x10', pkg:'10sheets', qty:10, date:'2025-03-15', supp:'bhphoto',        price:109.90, exp:'2027-06-01', rating:4 },
  { emul:['Ilford','FP4 Plus',125], fmt:'8x10', pkg:'10sheets', qty:10, date:'2026-02-01', supp:'filmphotostore', price: 99.90, exp:'2028-01-01', rating:4 },
];

const ORIGINAL_LOT_COUNT = 30;
const EXT_LOT_COUNT      = EXT_ROLL_DEFS.length + EXT_SHEET_DEFS.length;

// ── Main seeder ───────────────────────────────────────────────────────────────

export async function seedDemoExt(orm: MikroORM): Promise<void> {
  const em = orm.em.fork();

  const userEmail = (process.env['TEST_USER_EMAIL'] ?? 'demo@example.com').toLowerCase().trim();
  const user = await em.findOne(UserEntity, { email: userEmail });
  if (!user) {
    console.log(`Demo user "${userEmail}" not found — run db:seed first.`);
    return;
  }

  const existingLots = await em.count(FilmLotEntity, { user: user.id });
  if (existingLots < ORIGINAL_LOT_COUNT) {
    console.log(`Original demo data not found (${existingLots} lots < ${ORIGINAL_LOT_COUNT}). Run db:seed-demo first.`);
    return;
  }
  if (existingLots >= ORIGINAL_LOT_COUNT + EXT_LOT_COUNT) {
    console.log(`Extension data already present (${existingLots} lots). Skipping.`);
    return;
  }

  const refs = await loadRefs(em);

  // ── Suppliers ─────────────────────────────────────────────────────────────────
  const supplierMap = new Map<SupplierKey, FilmSupplierEntity>();
  for (const key of SUPPLIER_KEYS) {
    const normalizedName = SUPPLIER_NAMES[key];
    const supplier = await em.findOne(FilmSupplierEntity, { user: user.id, normalizedName });
    if (!supplier) throw new Error(`Supplier "${normalizedName}" not found — run db:seed-demo first.`);
    supplierMap.set(key, supplier);
  }

  // ── Labs ──────────────────────────────────────────────────────────────────────
  const labMap = new Map<LabKey, FilmLabEntity>();
  for (const key of LAB_KEYS) {
    const normalizedName = LAB_NAMES[key];
    const lab = await em.findOne(FilmLabEntity, { user: user.id, normalizedName });
    if (!lab) throw new Error(`Lab "${normalizedName}" not found — run db:seed-demo first.`);
    labMap.set(key, lab);
  }

  // ── Look up existing cameras for historical roll events ───────────────────────
  const cameraDevType = refs.devTypes.get('camera');
  if (!cameraDevType) throw new Error('Device type "camera" not found.');

  const existingDevices = await em.find(
    FilmDeviceEntity,
    { user: user.id, deviceType: cameraDevType },
    { populate: ['filmFormat'] }
  );
  const hist35 = existingDevices.find(d => d.filmFormat.code === '35mm');
  const hist120 = existingDevices.find(d => d.filmFormat.code === '120');
  if (!hist35 || !hist120) throw new Error('Original cameras not found — run db:seed-demo first.');

  // ── Create film holders ────────────────────────────────────────────────────────
  const holderDevType  = refs.devTypes.get('film_holder');
  const standardHolder = refs.holderTypes.get('standard');
  if (!holderDevType)  throw new Error('Device type "film_holder" not found.');
  if (!standardHolder) throw new Error('Holder type "standard" not found.');

  const holdersByFmt: Record<string, HolderRecord[]> = { '4x5': [], '5x7': [], '8x10': [] };

  for (const def of HOLDER_DEFS) {
    const format = refs.formats.get(def.fmt);
    if (!format) throw new Error(`Film format "${def.fmt}" not found.`);

    const device = em.create(FilmDeviceEntity, {
      user, deviceType: holderDevType, filmFormat: format, frameSize: def.frameSize,
    });
    em.persist(device);
    await em.flush();

    const holderEnt = em.create(FilmHolderEntity, {
      filmDevice: device,
      name: def.name,
      brand: def.brand,
      slotCount: def.slots,
      holderType: standardHolder,
    });
    em.persist(holderEnt);
    await em.flush();

    holdersByFmt[def.fmt]!.push({ device, entity: holderEnt });
  }

  // ── Shared references ─────────────────────────────────────────────────────────
  const fridgeLoc = refs.locations.get('refrigerator');
  if (!fridgeLoc) throw new Error('Storage location "refrigerator" not found.');

  const labs = (LAB_KEYS as readonly LabKey[]).map(k => labMap.get(k)!);

  const loadedSlotState  = refs.slotStates.get('loaded');
  const exposedSlotState = refs.slotStates.get('exposed');
  if (!loadedSlotState || !exposedSlotState) throw new Error('Slot states not found.');

  let rollCounter  = await em.count(FilmEntity, { user: user.id });
  let sheetCounter = 0;
  let totalFrames  = 0;

  // ── Additional 35mm/120 rolls ─────────────────────────────────────────────────
  for (const [lotIdx, def] of EXT_ROLL_DEFS.entries()) {
    const purchaseDate = new Date(def.date + 'T10:00:00.000Z');
    const ageMonths    = (NOW.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

    const emulKey  = `${def.emul[0]}|${def.emul[1]}|${def.emul[2]}`;
    const emulsion = refs.emulsions.get(emulKey);
    if (!emulsion) throw new Error(`Emulsion not found: ${emulKey}`);

    const format = refs.formats.get(def.fmt);
    if (!format) throw new Error(`Format not found: ${def.fmt}`);

    const pkgType = refs.pkgTypes.get(`${def.pkg}|${def.fmt}`);
    if (!pkgType) throw new Error(`Package type not found: ${def.pkg}|${def.fmt}`);

    const supplier = supplierMap.get(def.supp)!;

    const lot = em.create(FilmLotEntity, {
      user, emulsion, packageType: pkgType, filmFormat: format,
      quantity: def.qty,
      expirationDate: new Date(def.exp + 'T00:00:00.000Z').toISOString(),
      supplier,
      purchaseInfo: { channel: def.channel ?? 'online', price: def.price, currencyCode: 'USD', obtainedDate: purchaseDate.toISOString() },
      rating: def.rating ?? null,
      createdAt: purchaseDate.toISOString(),
    });
    em.persist(lot);
    await em.flush();

    const historicalCam = def.fmt === '35mm' ? hist35 : hist120;

    for (let filmIdx = 0; filmIdx < def.qty; filmIdx++) {
      rollCounter++;
      const ratio        = filmIdx / def.qty;
      const finalState   = assignFinalState(ageMonths, ratio, def.fmt);
      const lab          = labs[hash((ROLL_SEED_BASE + lotIdx) * 100 + filmIdx) % labs.length]!;
      const filmName     = `Roll #${String(rollCounter).padStart(3, '0')}`;
      const stateEntity  = refs.states.get(finalState)!;

      const film = em.create(FilmEntity, {
        user, filmLot: lot, name: filmName, emulsion,
        packageType: pkgType, filmFormat: format,
        expirationDate: new Date(def.exp + 'T00:00:00.000Z').toISOString(),
        currentState: stateEntity,
        currentDevice: null, // all ext rolls downgraded from active (cameras full)
      });
      em.persist(film);
      await em.flush();

      for (const spec of buildRollEvents(purchaseDate, finalState, lotIdx, filmIdx, historicalCam.id, lab.id, lab.name, fridgeLoc.id, fridgeLoc.code)) {
        em.persist(em.create(FilmJourneyEventEntity, { film, user, filmState: refs.states.get(spec.stateCode)!, occurredAt: spec.occurredAt, recordedAt: spec.occurredAt, notes: spec.notes, eventData: spec.eventData }));
      }
      await em.flush();

      if (stateIdx(finalState) >= stateIdx('loaded')) {
        const fc              = getFrameCount(def.pkg);
        const hasExposureData = stateIdx(finalState) >= stateIdx('exposed');
        for (let fnum = 1; fnum <= fc; fnum++) {
          const fSeed = (ROLL_SEED_BASE + lotIdx) * 10000 + filmIdx * 100 + fnum;
          em.persist(em.create(FilmFrameEntity, {
            user, film, frameNumber: fnum, currentState: stateEntity,
            aperture:            hasExposureData ? APERTURES[hash(fSeed)     % APERTURES.length]! : null,
            shutterSpeedSeconds: hasExposureData ? SHUTTERS [hash(fSeed + 1) % SHUTTERS.length]!  : null,
            filterUsed: null,
          }));
        }
        totalFrames += fc;
        await em.flush();
      }
    }

    process.stdout.write(`  Roll lot ${String(lotIdx + 1).padStart(2, '0')}/${EXT_ROLL_DEFS.length} — ${def.emul[0]} ${def.emul[1]} ${def.fmt} ×${def.qty}\n`);
  }

  // ── Large-format sheet lots ───────────────────────────────────────────────────
  for (const [lotIdx, def] of EXT_SHEET_DEFS.entries()) {
    const purchaseDate = new Date(def.date + 'T10:00:00.000Z');
    const ageMonths    = (NOW.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

    const emulKey  = `${def.emul[0]}|${def.emul[1]}|${def.emul[2]}`;
    const emulsion = refs.emulsions.get(emulKey);
    if (!emulsion) throw new Error(`Emulsion not found: ${emulKey}`);

    const format = refs.formats.get(def.fmt);
    if (!format) throw new Error(`Format not found: ${def.fmt}`);

    const pkgType = refs.pkgTypes.get(`${def.pkg}|${def.fmt}`);
    if (!pkgType) throw new Error(`Package type not found: ${def.pkg}|${def.fmt}`);

    const supplier    = supplierMap.get(def.supp)!;
    const formatHolders = holdersByFmt[def.fmt] ?? [];
    if (formatHolders.length === 0) throw new Error(`No holders for format ${def.fmt}.`);
    const histHolder  = formatHolders[0]!;

    const lot = em.create(FilmLotEntity, {
      user, emulsion, packageType: pkgType, filmFormat: format,
      quantity: def.qty,
      expirationDate: new Date(def.exp + 'T00:00:00.000Z').toISOString(),
      supplier,
      purchaseInfo: { channel: def.channel ?? 'online', price: def.price, currencyCode: 'USD', obtainedDate: purchaseDate.toISOString() },
      rating: def.rating ?? null,
      createdAt: purchaseDate.toISOString(),
    });
    em.persist(lot);
    await em.flush();

    for (let filmIdx = 0; filmIdx < def.qty; filmIdx++) {
      sheetCounter++;
      const ratio      = filmIdx / def.qty;
      const finalState = assignFinalState(ageMonths, ratio, def.fmt);
      const isActive   = finalState === 'loaded' || finalState === 'exposed';
      const lab        = labs[hash((SHEET_SEED_BASE + lotIdx) * 100 + filmIdx) % labs.length]!;
      const filmName   = `Sheet #${String(sheetCounter).padStart(3, '0')}`;
      const stateEntity = refs.states.get(finalState)!;

      // Claim a real slot for active sheets; reference the first holder historically
      let holderForEvent: HolderRecord = histHolder;
      let slotNumber = (filmIdx % 2) + 1;
      let claimed: ReturnType<typeof claimHolderSlot> = null;

      if (isActive) {
        claimed = claimHolderSlot(formatHolders);
        if (claimed) {
          holderForEvent = { device: claimed.device, entity: claimed.entity };
          slotNumber     = claimed.slotNumber;
        }
      }

      const film = em.create(FilmEntity, {
        user, filmLot: lot, name: filmName, emulsion,
        packageType: pkgType, filmFormat: format,
        expirationDate: new Date(def.exp + 'T00:00:00.000Z').toISOString(),
        currentState: stateEntity,
        currentDevice: isActive && claimed ? claimed.device : null,
      });
      em.persist(film);
      await em.flush();

      for (const spec of buildSheetEvents(purchaseDate, finalState, lotIdx, filmIdx, holderForEvent.device.id, slotNumber, lab.id, lab.name, fridgeLoc.id, fridgeLoc.code)) {
        em.persist(em.create(FilmJourneyEventEntity, { film, user, filmState: refs.states.get(spec.stateCode)!, occurredAt: spec.occurredAt, recordedAt: spec.occurredAt, notes: spec.notes, eventData: spec.eventData }));
      }
      await em.flush();

      if (isActive && claimed) {
        const slotStateEntity = finalState === 'loaded' ? loadedSlotState : exposedSlotState;
        em.persist(em.create(FilmHolderSlotEntity, {
          user,
          filmHolder:    claimed.entity,
          sideNumber:    claimed.slotNumber,
          slotState:     slotStateEntity,
          slotStateCode: finalState,
          loadedFilm:    film,
          createdAt:     iso(purchaseDate),
        }));
        await em.flush();
      }

      // 1 frame per sheet
      if (stateIdx(finalState) >= stateIdx('loaded')) {
        const hasExposureData = stateIdx(finalState) >= stateIdx('exposed');
        const fSeed = (SHEET_SEED_BASE + lotIdx) * 10000 + filmIdx * 100 + 1;
        em.persist(em.create(FilmFrameEntity, {
          user, film, frameNumber: 1, currentState: stateEntity,
          aperture:            hasExposureData ? APERTURES[hash(fSeed)     % APERTURES.length]! : null,
          shutterSpeedSeconds: hasExposureData ? SHUTTERS [hash(fSeed + 1) % SHUTTERS.length]!  : null,
          filterUsed: null,
        }));
        totalFrames += 1;
        await em.flush();
      }
    }

    process.stdout.write(`  Sheet lot ${String(lotIdx + 1).padStart(2, '0')}/${EXT_SHEET_DEFS.length} — ${def.emul[0]} ${def.emul[1]} ${def.fmt} ×${def.qty}\n`);
  }

  const addedRolls = EXT_ROLL_DEFS.reduce((sum, d) => sum + d.qty, 0);
  console.log(`\n✓ Extension seed complete:`);
  console.log(`  ${addedRolls} additional rolls (Roll #${rollCounter - addedRolls + 1}–#${rollCounter})`);
  console.log(`  ${sheetCounter} large-format sheets (Sheet #001–#${String(sheetCounter).padStart(3, '0')})`);
  console.log(`  ${totalFrames} additional frames`);
  console.log(`  ${HOLDER_DEFS.length} film holders (3×4x5, 1×5x7, 1×8x10)`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const orm = await MikroORM.init(ormConfig);
  try {
    await seedDemoExt(orm);
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
