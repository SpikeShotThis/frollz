import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { DatabaseService } from "./database.service";

// Helper to build a mock knex instance
const makeKnex = (overrides: Partial<{ raw: jest.Mock }> = {}) => ({
  raw: jest.fn().mockResolvedValue({ rows: [{ count: "0" }] }),
  migrate: { latest: jest.fn().mockResolvedValue(undefined) },
  ...overrides,
});

// Helper to build a DatabaseService with a given knex mock
async function buildService(
  knexOverrides: Partial<{ raw: jest.Mock }> = {},
): Promise<{
  service: DatabaseService;
  knex: ReturnType<typeof makeKnex>;
}> {
  const knex = makeKnex(knexOverrides);
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DatabaseService,
      { provide: "KNEX_CONNECTION", useValue: knex },
    ],
  }).compile();
  const service = module.get<DatabaseService>(DatabaseService);
  return { service, knex };
}

describe("DatabaseService — loadSeedData", () => {
  let service: DatabaseService;
  let knex: ReturnType<typeof makeKnex>;
  let readdirSyncSpy: jest.SpyInstance;
  let readFileSyncSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.spyOn(path, "join").mockImplementation((...parts) => parts.join("/"));
    jest.spyOn(fs, "existsSync").mockReturnValue(false);
    readdirSyncSpy = jest.spyOn(fs, "readdirSync").mockReturnValue([] as any);
    readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockReturnValue("[]");

    ({ service, knex } = await buildService());
  });

  afterEach(() => jest.restoreAllMocks());

  describe("file discovery and ordering", () => {
    it("should process seed files in lexicographic (numeric prefix) order", async () => {
      readdirSyncSpy.mockReturnValue([
        "0002-stocks.json",
        "0001-film-formats.json",
      ] as any);

      const insertedTables: string[] = [];
      knex.raw.mockImplementation((sql: string) => {
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
      knex.raw.mockImplementation((sql: string) => {
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
      const warnSpy = jest
        .spyOn(Logger.prototype, "warn")
        .mockImplementation(() => {});

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
      knex.raw.mockImplementation((sql: string) => {
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
      knex.raw.mockImplementation((sql: string) => {
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
      knex.raw.mockImplementation((sql: string, params?: unknown[]) => {
        if (/SELECT COUNT/.test(sql))
          return Promise.resolve({ rows: [{ count: "0" }] });
        if (/INSERT/.test(sql) && params) insertParams.push(params);
        return Promise.resolve({ rows: [] });
      });

      await (service as any).loadSeedData();

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
      knex.raw.mockImplementation((sql: string, params?: unknown[]) => {
        if (/SELECT COUNT/.test(sql))
          return Promise.resolve({ rows: [{ count: "0" }] });
        if (/INSERT/.test(sql) && params) insertParams.push(params);
        return Promise.resolve({ rows: [] });
      });

      await (service as any).loadSeedData();

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
      const logSpy = jest
        .spyOn(Logger.prototype, "log")
        .mockImplementation(() => {});

      const { knex } = await buildService();
      const insertCalls: string[] = [];
      knex.raw.mockImplementation((sql: string) => {
        if (/INSERT/.test(sql)) insertCalls.push(sql);
        return Promise.resolve({ rows: [] });
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          { provide: "KNEX_CONNECTION", useValue: knex },
        ],
      }).compile();
      const service = module.get<DatabaseService>(DatabaseService);
      await service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith(
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

  it("query should delegate to knex.raw and return rows", async () => {
    const rows = [{ id: "abc", value: "test" }];
    const { service, knex } = await buildService({
      raw: jest.fn().mockResolvedValue({ rows }),
    });

    const result = await service.query("SELECT * FROM tags WHERE id = ?", [
      "abc",
    ]);

    expect(knex.raw).toHaveBeenCalledWith("SELECT * FROM tags WHERE id = ?", [
      "abc",
    ]);
    expect(result).toEqual(rows);
  });

  it("execute should delegate to knex.raw without returning rows", async () => {
    const { service, knex } = await buildService({
      raw: jest.fn().mockResolvedValue({ rows: [] }),
    });

    await service.execute("DELETE FROM tags WHERE id = ?", ["abc"]);

    expect(knex.raw).toHaveBeenCalledWith("DELETE FROM tags WHERE id = ?", [
      "abc",
    ]);
  });
});
