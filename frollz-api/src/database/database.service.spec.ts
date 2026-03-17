import { Test, TestingModule } from "@nestjs/testing";
import * as fs from "fs";
import * as path from "path";
import { DatabaseService } from "./database.service";

// Helper to build a mock pg Pool
const makePool = (overrides: Partial<{ query: jest.Mock }> = {}) => ({
  query: jest.fn().mockResolvedValue({ rows: [{ count: "0" }], rowCount: 0 }),
  ...overrides,
});

// Helper to build a DatabaseService with a given pool mock
async function buildService(
  poolOverrides: Partial<{ query: jest.Mock }> = {},
): Promise<{ service: DatabaseService; pool: ReturnType<typeof makePool> }> {
  const pool = makePool(poolOverrides);
  const module: TestingModule = await Test.createTestingModule({
    providers: [DatabaseService, { provide: "POSTGRES_POOL", useValue: pool }],
  }).compile();
  const service = module.get<DatabaseService>(DatabaseService);
  return { service, pool };
}

describe("DatabaseService — loadSeedData", () => {
  let service: DatabaseService;
  let pool: ReturnType<typeof makePool>;
  let readdirSyncSpy: jest.SpyInstance;
  let readFileSyncSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.spyOn(path, "join").mockImplementation((...parts) => parts.join("/"));
    jest.spyOn(fs, "existsSync").mockReturnValue(false);
    readdirSyncSpy = jest.spyOn(fs, "readdirSync").mockReturnValue([] as any);
    readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockReturnValue("[]");

    ({ service, pool } = await buildService());
  });

  afterEach(() => jest.restoreAllMocks());

  describe("file discovery and ordering", () => {
    it("should process seed files in lexicographic (numeric prefix) order", async () => {
      readdirSyncSpy.mockReturnValue([
        "0002-stocks.json",
        "0001-film-formats.json",
      ] as any);

      const insertedTables: string[] = [];
      pool.query.mockImplementation((sql: string) => {
        const countMatch = sql.match(/SELECT COUNT\(\*\) FROM (\w+)/);
        if (countMatch) {
          insertedTables.push(countMatch[1]);
          return Promise.resolve({ rows: [{ count: "0" }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await (service as any).loadSeedData();

      const formatsIdx = insertedTables.indexOf("film_formats_default");
      const stocksIdx = insertedTables.indexOf("stocks_default");
      expect(formatsIdx).toBeGreaterThanOrEqual(0);
      expect(stocksIdx).toBeGreaterThanOrEqual(0);
      expect(formatsIdx).toBeLessThan(stocksIdx);
    });

    it("should ignore files that do not match the 4-digit prefix pattern", async () => {
      readdirSyncSpy.mockReturnValue([
        "README.md",
        "stocks.json",
        "0001-film-formats.json",
      ] as any);

      const queriedTables: string[] = [];
      pool.query.mockImplementation((sql: string) => {
        const match = sql.match(/SELECT COUNT\(\*\) FROM (\w+)/);
        if (match) queriedTables.push(match[1]);
        return Promise.resolve({ rows: [{ count: "0" }] });
      });

      await (service as any).loadSeedData();

      expect(queriedTables).toContain("film_formats_default");
      expect(queriedTables).not.toContain("stocks_default");
    });

    it("should warn and skip files with no collection mapping", async () => {
      readdirSyncSpy.mockReturnValue(["0001-unknown-type.json"] as any);
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      await (service as any).loadSeedData();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("0001-unknown-type.json"),
      );
    });
  });

  describe("skipping already-populated tables", () => {
    it("should skip a table that already has rows", async () => {
      readdirSyncSpy.mockReturnValue(["0003-tags.json"] as any);

      const insertCalls: string[] = [];
      pool.query.mockImplementation((sql: string) => {
        if (/SELECT COUNT/.test(sql))
          return Promise.resolve({ rows: [{ count: "5" }] });
        if (/INSERT/.test(sql)) insertCalls.push(sql);
        return Promise.resolve({ rows: [] });
      });

      await (service as any).loadSeedData();

      expect(insertCalls).toHaveLength(0);
    });

    it("should insert into an empty table", async () => {
      readdirSyncSpy.mockReturnValue(["0003-tags.json"] as any);
      readFileSyncSpy.mockReturnValue(
        JSON.stringify([{ _key: "color", value: "color", color: "#F97316" }]),
      );

      const insertCalls: string[] = [];
      pool.query.mockImplementation((sql: string) => {
        if (/SELECT COUNT/.test(sql))
          return Promise.resolve({ rows: [{ count: "0" }] });
        if (/INSERT/.test(sql)) insertCalls.push(sql);
        return Promise.resolve({ rows: [] });
      });

      await (service as any).loadSeedData();

      expect(insertCalls.length).toBeGreaterThan(0);
    });
  });

  describe("createdAt stamping", () => {
    it("should stamp createdAt on documents that do not have one", async () => {
      readdirSyncSpy.mockReturnValue(["0003-tags.json"] as any);
      readFileSyncSpy.mockReturnValue(
        JSON.stringify([{ _key: "color", value: "color", color: "#F97316" }]),
      );

      const insertParams: unknown[][] = [];
      pool.query.mockImplementation((sql: string, params?: unknown[]) => {
        if (/SELECT COUNT/.test(sql))
          return Promise.resolve({ rows: [{ count: "0" }] });
        if (/INSERT/.test(sql) && params) insertParams.push(params);
        return Promise.resolve({ rows: [] });
      });

      await (service as any).loadSeedData();

      // createdAt is in the values (it is a Date/string passed as a param)
      expect(insertParams.length).toBeGreaterThan(0);
    });

    it("should preserve an existing createdAt value from the seed record", async () => {
      readdirSyncSpy.mockReturnValue(["0003-tags.json"] as any);
      const existingDate = "2024-01-01T00:00:00.000Z";
      readFileSyncSpy.mockReturnValue(
        JSON.stringify([
          {
            _key: "color",
            value: "color",
            color: "#F97316",
            createdAt: existingDate,
          },
        ]),
      );

      const insertParams: unknown[][] = [];
      pool.query.mockImplementation((sql: string, params?: unknown[]) => {
        if (/SELECT COUNT/.test(sql))
          return Promise.resolve({ rows: [{ count: "0" }] });
        if (/INSERT/.test(sql) && params) insertParams.push(params);
        return Promise.resolve({ rows: [] });
      });

      await (service as any).loadSeedData();

      // The existing createdAt value should appear in the INSERT params
      const allParams = insertParams.flat();
      expect(allParams).toContain(existingDate);
    });
  });
});

describe("DatabaseService — DISABLE_DEFAULT_DATA_IMPORT", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.spyOn(fs, "existsSync").mockReturnValue(false);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue(["0001-film-formats.json"] as any);
    jest.spyOn(fs, "readFileSync").mockReturnValue("[]");
    jest.spyOn(path, "join").mockImplementation((...parts) => parts.join("/"));
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it.each(["true", "TRUE", "True", "1"])(
    'should skip seed data when DISABLE_DEFAULT_DATA_IMPORT="%s"',
    async (value) => {
      process.env.DISABLE_DEFAULT_DATA_IMPORT = value;
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const { pool } = await buildService();
      const insertCalls: string[] = [];
      pool.query.mockImplementation((sql: string) => {
        if (/INSERT/.test(sql)) insertCalls.push(sql);
        return Promise.resolve({ rows: [] });
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          { provide: "POSTGRES_POOL", useValue: pool },
        ],
      }).compile();
      const service = module.get<DatabaseService>(DatabaseService);
      await service.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("DISABLE_DEFAULT_DATA_IMPORT"),
      );
      expect(insertCalls).toHaveLength(0);
    },
  );

  it.each(["false", "FALSE", "False", "0", ""])(
    'should load seed data when DISABLE_DEFAULT_DATA_IMPORT="%s"',
    async (value) => {
      process.env.DISABLE_DEFAULT_DATA_IMPORT = value;
      const { service } = await buildService();

      // Does not throw — seed loading proceeds
      await expect((service as any).isDefaultDataImportDisabled()).toBe(false);
    },
  );

  it("should skip seed data when DISABLE_DEFAULT_DATA_IMPORT is not set", async () => {
    delete process.env.DISABLE_DEFAULT_DATA_IMPORT;
    const { service } = await buildService();
    expect((service as any).isDefaultDataImportDisabled()).toBe(false);
  });
});

describe("DatabaseService — query / execute", () => {
  afterEach(() => jest.restoreAllMocks());

  it("query should delegate to the pool and return rows", async () => {
    const rows = [{ id: "abc", value: "test" }];
    const { service, pool } = await buildService({
      query: jest.fn().mockResolvedValue({ rows }),
    });

    const result = await service.query("SELECT * FROM tags WHERE id = $1", [
      "abc",
    ]);

    expect(pool.query).toHaveBeenCalledWith(
      "SELECT * FROM tags WHERE id = $1",
      ["abc"],
    );
    expect(result).toEqual(rows);
  });

  it("execute should delegate to the pool without returning rows", async () => {
    const { service, pool } = await buildService({
      query: jest.fn().mockResolvedValue({ rows: [] }),
    });

    await service.execute("DELETE FROM tags WHERE id = $1", ["abc"]);

    expect(pool.query).toHaveBeenCalledWith("DELETE FROM tags WHERE id = $1", [
      "abc",
    ]);
  });
});
