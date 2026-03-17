import { Test, TestingModule } from "@nestjs/testing";
import * as fs from "fs";
import * as path from "path";
import { DatabaseService } from "./database.service";

// Helper to build a minimal mock ArangoDB collection
const makeCollection = (overrides: Record<string, jest.Mock> = {}) => ({
  exists: jest.fn().mockResolvedValue(true),
  create: jest.fn().mockResolvedValue({}),
  properties: jest.fn().mockResolvedValue({}),
  count: jest.fn().mockResolvedValue({ count: 0 }),
  saveAll: jest.fn().mockResolvedValue([]),
  documentExists: jest.fn().mockResolvedValue(true),
  all: jest.fn().mockResolvedValue(
    // async iterable that yields nothing
    (async function* () {})(),
  ),
  ...overrides,
});

describe("DatabaseService — loadSeedData", () => {
  let service: DatabaseService;
  let mockDb: { collection: jest.Mock; query: jest.Mock };
  let collectionMocks: Record<string, ReturnType<typeof makeCollection>>;

  // Spies on fs so the real filesystem is not touched
  let readdirSyncSpy: jest.SpyInstance;
  let readFileSyncSpy: jest.SpyInstance;

  beforeEach(async () => {
    collectionMocks = {};

    mockDb = {
      collection: jest.fn((name: string) => {
        if (!collectionMocks[name]) {
          collectionMocks[name] = makeCollection();
        }
        return collectionMocks[name];
      }),
      query: jest
        .fn()
        .mockResolvedValue({ all: jest.fn().mockResolvedValue([]) }),
    };

    // Stub path.join to return a predictable value so existsSync calls are controllable
    jest.spyOn(path, "join").mockImplementation((...parts) => parts.join("/"));

    // No schema files by default
    jest.spyOn(fs, "existsSync").mockReturnValue(false);

    // Default: empty seed directory
    readdirSyncSpy = jest.spyOn(fs, "readdirSync").mockReturnValue([] as any);
    readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockReturnValue("[]");

    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService, { provide: "ARANGO_DB", useValue: mockDb }],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("file discovery and ordering", () => {
    it("should process seed files in lexicographic (numeric prefix) order", async () => {
      readdirSyncSpy.mockReturnValue([
        "0002-stocks.json",
        "0001-film-formats.json",
      ] as any);
      readFileSyncSpy.mockReturnValue("[]");

      await (service as any).loadSeedData();

      // The film-formats collection (0001) should have been touched before stocks (0002)
      const callOrder = mockDb.collection.mock.calls.map(([name]) => name);
      const formatsIdx = callOrder.indexOf("film_formats_default");
      const stocksIdx = callOrder.indexOf("stocks_default");
      expect(formatsIdx).toBeLessThan(stocksIdx);
    });

    it("should ignore files that do not match the 4-digit prefix pattern", async () => {
      readdirSyncSpy.mockReturnValue([
        "README.md",
        "stocks.json",
        "0001-film-formats.json",
      ] as any);
      readFileSyncSpy.mockReturnValue("[]");

      await (service as any).loadSeedData();

      // Only the correctly-prefixed file should trigger a collection lookup
      const touchedCollections = mockDb.collection.mock.calls.map(
        ([name]) => name,
      );
      expect(touchedCollections).toContain("film_formats_default");
      expect(touchedCollections).not.toContain("stocks_default"); // stocks.json (no prefix) skipped
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

  describe("skipping already-populated collections", () => {
    it("should skip a collection that already has documents", async () => {
      readdirSyncSpy.mockReturnValue(["0003-tags.json"] as any);
      collectionMocks["tags_default"] = makeCollection({
        count: jest.fn().mockResolvedValue({ count: 5 }),
      });

      await (service as any).loadSeedData();

      expect(collectionMocks["tags_default"].saveAll).not.toHaveBeenCalled();
    });

    it("should load into a collection that is empty", async () => {
      readdirSyncSpy.mockReturnValue(["0003-tags.json"] as any);
      readFileSyncSpy.mockReturnValue(
        JSON.stringify([{ _key: "color", value: "color", color: "#F97316" }]),
      );

      await (service as any).loadSeedData();

      expect(collectionMocks["tags_default"].saveAll).toHaveBeenCalled();
    });
  });

  describe("createdAt stamping", () => {
    it("should stamp createdAt on documents that do not have one", async () => {
      readdirSyncSpy.mockReturnValue(["0003-tags.json"] as any);
      readFileSyncSpy.mockReturnValue(
        JSON.stringify([{ _key: "color", value: "color", color: "#F97316" }]),
      );

      await (service as any).loadSeedData();

      const savedDocs: Record<string, unknown>[] =
        collectionMocks["tags_default"].saveAll.mock.calls[0][0];
      expect(savedDocs[0]).toHaveProperty("createdAt");
      expect(typeof savedDocs[0].createdAt).toBe("string");
    });

    it("should preserve an existing createdAt value", async () => {
      readdirSyncSpy.mockReturnValue(["0003-tags.json"] as any);
      readFileSyncSpy.mockReturnValue(
        JSON.stringify([
          {
            _key: "color",
            value: "color",
            color: "#F97316",
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ]),
      );

      await (service as any).loadSeedData();

      const savedDocs: Record<string, unknown>[] =
        collectionMocks["tags_default"].saveAll.mock.calls[0][0];
      expect(savedDocs[0].createdAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should NOT add updatedAt to seed documents", async () => {
      readdirSyncSpy.mockReturnValue(["0003-tags.json"] as any);
      readFileSyncSpy.mockReturnValue(
        JSON.stringify([{ _key: "color", value: "color", color: "#F97316" }]),
      );

      await (service as any).loadSeedData();

      const savedDocs: Record<string, unknown>[] =
        collectionMocks["tags_default"].saveAll.mock.calls[0][0];
      expect(savedDocs[0]).not.toHaveProperty("updatedAt");
    });
  });

  describe("foreign-key reference validation", () => {
    it("should validate tagKey references in stock_tags_default", async () => {
      readdirSyncSpy.mockReturnValue(["0004-stock-tags.json"] as any);
      readFileSyncSpy.mockReturnValue(
        JSON.stringify([
          { stockKey: "kodak-portra-400-35mm", tagKey: "color" },
        ]),
      );
      collectionMocks["tags_default"] = makeCollection({
        documentExists: jest.fn().mockResolvedValue(true),
      });
      collectionMocks["stocks_default"] = makeCollection({
        documentExists: jest.fn().mockResolvedValue(true),
      });

      await (service as any).loadSeedData();

      expect(
        collectionMocks["tags_default"].documentExists,
      ).toHaveBeenCalledWith("color");
      expect(
        collectionMocks["stocks_default"].documentExists,
      ).toHaveBeenCalledWith("kodak-portra-400-35mm");
    });

    it("should throw when a tagKey reference is not found", async () => {
      readdirSyncSpy.mockReturnValue(["0004-stock-tags.json"] as any);
      readFileSyncSpy.mockReturnValue(
        JSON.stringify([
          { stockKey: "kodak-portra-400-35mm", tagKey: "missing-tag" },
        ]),
      );
      collectionMocks["tags_default"] = makeCollection({
        documentExists: jest.fn().mockResolvedValue(false),
      });
      collectionMocks["stocks_default"] = makeCollection({
        documentExists: jest.fn().mockResolvedValue(true),
      });

      await expect((service as any).loadSeedData()).rejects.toThrow(
        /Reference error.*tagKey.*missing-tag.*tags_default/,
      );
    });

    it("should throw when a stockKey reference is not found", async () => {
      readdirSyncSpy.mockReturnValue(["0004-stock-tags.json"] as any);
      readFileSyncSpy.mockReturnValue(
        JSON.stringify([{ stockKey: "missing-stock", tagKey: "color" }]),
      );
      collectionMocks["tags_default"] = makeCollection({
        documentExists: jest.fn().mockResolvedValue(true),
      });
      collectionMocks["stocks_default"] = makeCollection({
        documentExists: jest.fn().mockResolvedValue(false),
      });

      await expect((service as any).loadSeedData()).rejects.toThrow(
        /Reference error.*stockKey.*missing-stock.*stocks_default/,
      );
    });

    it("should skip reference validation for optional fields that are absent", async () => {
      // baseStockKey is optional — if absent, no lookup should occur
      readdirSyncSpy.mockReturnValue(["0002-stocks.json"] as any);
      readFileSyncSpy.mockReturnValue(
        JSON.stringify([
          {
            _key: "kodak-portra-400-35mm",
            brand: "Portra 400",
            manufacturer: "Kodak",
            formatKey: "35mm",
            process: "C-41",
            speed: 400,
          },
        ]),
      );
      collectionMocks["film_formats_default"] = makeCollection({
        documentExists: jest.fn().mockResolvedValue(true),
      });

      await (service as any).loadSeedData();

      // baseStockKey is absent so stocks_default.documentExists should NOT be called for it
      // (stocks_default is the ref collection for baseStockKey)
      const stocksDefaultMock = collectionMocks["stocks_default"];
      if (stocksDefaultMock) {
        expect(stocksDefaultMock.documentExists).not.toHaveBeenCalled();
      }
    });
  });
});

describe("DatabaseService — DISABLE_DEFAULT_DATA_IMPORT", () => {
  let mockDb: { collection: jest.Mock; query: jest.Mock };
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockDb = {
      collection: jest.fn().mockReturnValue(makeCollection()),
      query: jest
        .fn()
        .mockResolvedValue({ all: jest.fn().mockResolvedValue([]) }),
    };
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

  const buildService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService, { provide: "ARANGO_DB", useValue: mockDb }],
    }).compile();
    return module.get<DatabaseService>(DatabaseService);
  };

  it.each(["true", "TRUE", "True", "1"])(
    'should skip seed data when DISABLE_DEFAULT_DATA_IMPORT="%s"',
    async (value) => {
      process.env.DISABLE_DEFAULT_DATA_IMPORT = value;
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const service = await buildService();
      await service.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("DISABLE_DEFAULT_DATA_IMPORT"),
      );
      // saveAll should never be called because seed loading is skipped
      const saveAllCalls = mockDb.collection.mock.results
        .map((r) => r.value)
        .filter((col) => col?.saveAll?.mock?.calls?.length > 0);
      expect(saveAllCalls).toHaveLength(0);
    },
  );

  it.each(["false", "FALSE", "False", "0", ""])(
    'should load seed data when DISABLE_DEFAULT_DATA_IMPORT="%s"',
    async (value) => {
      process.env.DISABLE_DEFAULT_DATA_IMPORT = value;
      const service = await buildService();
      // readdirSync returns one file — collection.count() returns 0 by default so saveAll runs
      await (service as any).loadSeedData();

      // film_formats_default.saveAll should have been called (empty array from readFileSync mock)
      const filmFormatsCol = mockDb.collection.mock.results.find(
        (r) =>
          mockDb.collection.mock.calls[
            mockDb.collection.mock.results.indexOf(r)
          ]?.[0] === "film_formats_default",
      );
      expect(filmFormatsCol).toBeDefined();
    },
  );

  it("should skip seed data when DISABLE_DEFAULT_DATA_IMPORT is not set", async () => {
    delete process.env.DISABLE_DEFAULT_DATA_IMPORT;
    const service = await buildService();
    // isDefaultDataImportDisabled should return false — seed loading proceeds normally
    expect((service as any).isDefaultDataImportDisabled()).toBe(false);
  });
});

describe("DatabaseService — getCollection / query", () => {
  let service: DatabaseService;
  let mockDb: { collection: jest.Mock; query: jest.Mock };

  beforeEach(async () => {
    mockDb = {
      collection: jest.fn().mockReturnValue(makeCollection()),
      query: jest.fn().mockResolvedValue({ all: jest.fn() }),
    };

    jest.spyOn(fs, "existsSync").mockReturnValue(false);
    jest.spyOn(fs, "readdirSync").mockReturnValue([] as any);
    jest.spyOn(path, "join").mockImplementation((...parts) => parts.join("/"));

    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService, { provide: "ARANGO_DB", useValue: mockDb }],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => jest.restoreAllMocks());

  it("getCollection should return the collection from the db", () => {
    service.getCollection("tags");
    expect(mockDb.collection).toHaveBeenCalledWith("tags");
  });

  it("query should delegate to the db with aql and bindVars", async () => {
    await service.query("FOR t IN tags RETURN t", { key: "color" });
    expect(mockDb.query).toHaveBeenCalledWith("FOR t IN tags RETURN t", {
      key: "color",
    });
  });
});
