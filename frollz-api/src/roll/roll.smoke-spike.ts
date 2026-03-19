/**
 * Smoke tests for the live Frollz API stack.
 *
 * Exercises the full lifecycle for both standard (C-41) and instant film rolls,
 * verifies transition-profile assignment and graph correctness, and confirms
 * state history is recorded properly.
 *
 * Run:
 *   npm run test:smoke
 *
 * Environment:
 *   SMOKE_BASE_URL  Override the API base URL (default: http://localhost:3000/api)
 *
 * Data-persistence test (postgres volume):
 *   1. Run: npm run test:smoke
 *   2. Restart the stack: docker compose down && docker compose up -d
 *   3. Run again: npm run test:smoke
 *   On step 3 the test creates fresh rolls, but the default seeded data should
 *   still be present, confirming the postgres volume survived the restart.
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000/api";

// ── HTTP helpers ──────────────────────────────────────────────────────────────

interface JsonResponse<T> {
  status: number;
  ok: boolean;
  data: T;
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<JsonResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as T;
  return { status: res.status, ok: res.ok, data };
}

async function GET<T>(path: string): Promise<T> {
  const { ok, status, data } = await apiRequest<T>("GET", path);
  if (!ok) throw new Error(`GET ${path} returned ${status}`);
  return data;
}

async function POST<T>(path: string, body: unknown): Promise<JsonResponse<T>> {
  return apiRequest<T>("POST", path, body);
}

async function DELETE(path: string): Promise<void> {
  await apiRequest<unknown>("DELETE", path);
}

async function transition(
  rollKey: string,
  targetState: string,
  opts: { date?: string; metadata?: Record<string, unknown> } = {},
): Promise<Record<string, unknown>> {
  const { ok, status, data } = await POST<Record<string, unknown>>(
    `/rolls/${rollKey}/transition`,
    { targetState, ...opts },
  );
  if (!ok)
    throw new Error(
      `Transition to '${targetState}' failed (${status}): ${JSON.stringify(data)}`,
    );
  return data;
}

// ── Shared test state ─────────────────────────────────────────────────────────

interface RollRow {
  _key: string;
  state: string;
  transitionProfile: string;
  stockName: string;
}

interface TransitionEdge {
  fromState: string;
  toState: string;
  metadata: Array<{ field: string }>;
}

interface TransitionGraph {
  states: string[];
  transitions: TransitionEdge[];
}

interface RollState {
  _key: string;
  state: string;
}

let stdRollKey: string;
let instRollKey: string;
let stdRoll: RollRow;
let instRoll: RollRow;
let stdGraph: TransitionGraph;
let instGraph: TransitionGraph;
let instSentForDevStatus: number;
let stdHistory: RollState[];
let instHistory: RollState[];

const toDelete: string[] = [];

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  const TODAY = new Date().toISOString();
  const SUFFIX = Date.now();

  // Use the first seeded film format (formats are enum-validated so we can't
  // create an arbitrary one; the default seed always provides at least one).
  const formats = await GET<Array<{ _key: string }>>("/film-formats");
  expect(formats.length).toBeGreaterThan(0);
  const formatKey = formats[0]._key;

  // -- Stocks ------------------------------------------------------------------

  const { data: stdStock } = await POST<{ _key: string }>("/stocks", {
    formatKey,
    process: "C-41",
    manufacturer: "Smoke Test Co",
    brand: `Smoke C41 ${SUFFIX}`,
    speed: 400,
  });
  expect(stdStock._key).toBeTruthy();
  toDelete.push(`/stocks/${stdStock._key}`);

  const { data: instStock } = await POST<{ _key: string }>("/stocks", {
    formatKey,
    process: "Instant",
    manufacturer: "Smoke Test Co",
    brand: `Smoke Instax ${SUFFIX}`,
    speed: 800,
  });
  expect(instStock._key).toBeTruthy();
  toDelete.push(`/stocks/${instStock._key}`);

  // -- Rolls -------------------------------------------------------------------

  const { data: rawStdRoll } = await POST<RollRow>("/rolls", {
    stockKey: stdStock._key,
    dateObtained: TODAY,
    obtainmentMethod: "Purchase",
    obtainedFrom: "Smoke Test Store",
    timesExposedToXrays: 0,
  });
  stdRollKey = rawStdRoll._key;
  stdRoll = rawStdRoll;
  toDelete.push(`/rolls/${stdRollKey}`);

  const { data: rawInstRoll } = await POST<RollRow>("/rolls", {
    stockKey: instStock._key,
    dateObtained: TODAY,
    obtainmentMethod: "Purchase",
    obtainedFrom: "Smoke Test Store",
    timesExposedToXrays: 0,
  });
  instRollKey = rawInstRoll._key;
  instRoll = rawInstRoll;
  toDelete.push(`/rolls/${instRollKey}`);

  // -- Transition graphs -------------------------------------------------------

  stdGraph = await GET<TransitionGraph>("/transitions?profile=standard");
  instGraph = await GET<TransitionGraph>("/transitions?profile=instant");

  // -- Standard lifecycle: Added → Shelved → Loaded → Finished → SentForDev --

  await transition(stdRollKey, "Shelved", { date: TODAY });
  await transition(stdRollKey, "Loaded", { date: TODAY });
  await transition(stdRollKey, "Finished", {
    date: TODAY,
    metadata: { shotISO: 400 },
  });
  await transition(stdRollKey, "Sent For Development", {
    date: TODAY,
    metadata: {
      labName: "The Darkroom",
      deliveryMethod: "Mail in",
      processRequested: "C-41",
    },
  });

  // -- Instant lifecycle: Added → Shelved → Loaded → Finished → Received ------

  await transition(instRollKey, "Shelved", { date: TODAY });
  await transition(instRollKey, "Loaded", { date: TODAY });
  await transition(instRollKey, "Finished", { date: TODAY });

  // Negative test: instant roll must NOT be able to reach Sent For Development
  const reject = await POST<unknown>(`/rolls/${instRollKey}/transition`, {
    targetState: "Sent For Development",
  });
  instSentForDevStatus = reject.status;

  // Direct Finished → Received (no lab step)
  await transition(instRollKey, "Received", {
    metadata: { scansReceived: true },
  });

  // -- Final state + history ----------------------------------------------------

  stdRoll = await GET<RollRow>(`/rolls/${stdRollKey}`);
  instRoll = await GET<RollRow>(`/rolls/${instRollKey}`);
  stdHistory = await GET<RollState[]>(`/roll-states?rollKey=${stdRollKey}`);
  instHistory = await GET<RollState[]>(`/roll-states?rollKey=${instRollKey}`);
});

afterAll(async () => {
  for (const path of [...toDelete].reverse()) {
    await DELETE(path).catch(() => {
      /* best-effort cleanup */
    });
  }
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("API health", () => {
  it("is reachable", async () => {
    const formats = await GET<unknown[]>("/film-formats");
    expect(formats.length).toBeGreaterThan(0);
  });
});

describe("Roll creation — transition profile assignment", () => {
  it("standard (C-41) roll is assigned the standard profile", () => {
    expect(stdRoll.transitionProfile).toBe("standard");
  });

  it("instant roll is assigned the instant profile", () => {
    expect(instRoll.transitionProfile).toBe("instant");
  });
});

describe("Standard transition graph (/transitions?profile=standard)", () => {
  const edge = (from: string, to: string) => (g: TransitionGraph) =>
    g.transitions.find((t) => t.fromState === from && t.toState === to);

  it("has a Finished → Sent For Development edge", () => {
    expect(edge("Finished", "Sent For Development")(stdGraph)).toBeDefined();
  });

  it("has a Developed → Received edge", () => {
    expect(edge("Developed", "Received")(stdGraph)).toBeDefined();
  });

  it("has no direct Finished → Received edge", () => {
    expect(edge("Finished", "Received")(stdGraph)).toBeUndefined();
  });
});

describe("Instant transition graph (/transitions?profile=instant)", () => {
  const edge = (from: string, to: string) =>
    instGraph.transitions.find((t) => t.fromState === from && t.toState === to);

  it("has a direct Finished → Received edge", () => {
    expect(edge("Finished", "Received")).toBeDefined();
  });

  it("Finished → Received edge carries scans/negatives metadata", () => {
    const fields = edge("Finished", "Received")
      ?.metadata.map((m) => m.field)
      .sort();
    expect(fields).toEqual([
      "negativesDate",
      "negativesReceived",
      "scansReceived",
      "scansUrl",
    ]);
  });

  it("has a Received → Finished backward edge", () => {
    expect(edge("Received", "Finished")).toBeDefined();
  });

  it("has no Sent For Development edge", () => {
    const sfds = instGraph.transitions.filter(
      (t) => t.toState === "Sent For Development",
    );
    expect(sfds).toHaveLength(0);
  });

  it("has no Developed edge", () => {
    const developed = instGraph.transitions.filter(
      (t) => t.toState === "Developed" || t.fromState === "Developed",
    );
    expect(developed).toHaveLength(0);
  });
});

describe("Standard roll lifecycle (C-41 — lab workflow)", () => {
  it("ends in Sent For Development state", () => {
    expect(stdRoll.state).toBe("Sent For Development");
  });

  it("has 5 state-history entries (Added → Shelved → Loaded → Finished → Sent For Development)", () => {
    expect(stdHistory).toHaveLength(5);
  });

  it("history entries are in the correct order", () => {
    // Sort by createdAt (server-assigned) rather than date (user-supplied) so
    // entries that share the same user-facing date still sort deterministically.
    const states = stdHistory
      .slice()
      .sort(
        (a, b) =>
          new Date((a as any).createdAt as string).getTime() -
          new Date((b as any).createdAt as string).getTime(),
      )
      .map((e) => e.state);
    expect(states).toEqual([
      "Added",
      "Shelved",
      "Loaded",
      "Finished",
      "Sent For Development",
    ]);
  });
});

describe("Instant roll lifecycle (no lab step)", () => {
  it("ends in Received state", () => {
    expect(instRoll.state).toBe("Received");
  });

  it("rejects a Sent For Development transition with 400", () => {
    expect(instSentForDevStatus).toBe(400);
  });

  it("has 5 state-history entries (Added → Shelved → Loaded → Finished → Received)", () => {
    expect(instHistory).toHaveLength(5);
  });

  it("history entries are in the correct order", () => {
    const states = instHistory
      .slice()
      .sort(
        (a, b) =>
          new Date((a as any).createdAt as string).getTime() -
          new Date((b as any).createdAt as string).getTime(),
      )
      .map((e) => e.state);
    expect(states).toEqual([
      "Added",
      "Shelved",
      "Loaded",
      "Finished",
      "Received",
    ]);
  });
});
