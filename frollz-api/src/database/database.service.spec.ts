import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { DatabaseService } from "./database.service";

const makeKnex = () => ({
  raw: jest.fn().mockResolvedValue({ rows: [] }),
  migrate: { latest: jest.fn().mockResolvedValue(undefined) },
});

async function buildService(knex: ReturnType<typeof makeKnex>) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DatabaseService,
      { provide: "KNEX_CONNECTION", useValue: knex },
    ],
  }).compile();
  return module.get<DatabaseService>(DatabaseService);
}

describe("DatabaseService — onModuleInit", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("should run migrations and populate system tags and main tables by default", async () => {
    const knex = makeKnex();
    const service = await buildService(knex);

    await service.onModuleInit();

    expect(knex.migrate.latest).toHaveBeenCalled();

    const rawCalls: [string, string[] | undefined][] = knex.raw.mock.calls.map(
      ([sql, params]: [string, string[] | undefined]) => [sql, params],
    );
    expect(rawCalls.some(([sql]) => /is_system = true/.test(sql))).toBe(true);
    const tableInserts = rawCalls.filter(([sql]) =>
      /INSERT INTO \?\?/.test(sql),
    );
    expect(tableInserts.some(([, p]) => p?.[0] === "film_formats")).toBe(true);
    expect(tableInserts.some(([, p]) => p?.[0] === "stocks")).toBe(true);
    expect(tableInserts.some(([, p]) => p?.[0] === "tags")).toBe(true);
    expect(tableInserts.some(([, p]) => p?.[0] === "stock_tags")).toBe(true);
  });

  it("should always populate system tags even when DISABLE_DEFAULT_DATA_IMPORT is set", async () => {
    process.env = { ...originalEnv, DISABLE_DEFAULT_DATA_IMPORT: "true" };
    const logSpy = jest
      .spyOn(Logger.prototype, "log")
      .mockImplementation(() => {});
    const knex = makeKnex();
    const service = await buildService(knex);

    await service.onModuleInit();

    const rawCalls: [string, string[] | undefined][] = knex.raw.mock.calls.map(
      ([sql, params]: [string, string[] | undefined]) => [sql, params],
    );
    expect(rawCalls.some(([sql]) => /is_system = true/.test(sql))).toBe(true);
    const tableInserts = rawCalls.filter(([sql]) =>
      /INSERT INTO \?\?/.test(sql),
    );
    expect(tableInserts.some(([, p]) => p?.[0] === "film_formats")).toBe(false);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("DISABLE_DEFAULT_DATA_IMPORT"),
    );
  });
});

describe("DatabaseService — isDefaultDataImportDisabled", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it.each(["true", "TRUE", "True", "1"])(
    'should return true when DISABLE_DEFAULT_DATA_IMPORT="%s"',
    async (value) => {
      process.env = { ...originalEnv, DISABLE_DEFAULT_DATA_IMPORT: value };
      const service = await buildService(makeKnex());
      expect((service as any).isDefaultDataImportDisabled()).toBe(true);
    },
  );

  it.each(["false", "FALSE", "0", ""])(
    'should return false when DISABLE_DEFAULT_DATA_IMPORT="%s"',
    async (value) => {
      process.env = { ...originalEnv, DISABLE_DEFAULT_DATA_IMPORT: value };
      const service = await buildService(makeKnex());
      expect((service as any).isDefaultDataImportDisabled()).toBe(false);
    },
  );

  it("should return false when DISABLE_DEFAULT_DATA_IMPORT is not set", async () => {
    delete process.env.DISABLE_DEFAULT_DATA_IMPORT;
    const service = await buildService(makeKnex());
    expect((service as any).isDefaultDataImportDisabled()).toBe(false);
  });
});

describe("DatabaseService — query / execute", () => {
  it("query should delegate to knex.raw and return rows", async () => {
    const rows = [{ id: "abc", value: "test" }];
    const knex = makeKnex();
    knex.raw.mockResolvedValue({ rows });
    const service = await buildService(knex);

    const result = await service.query("SELECT * FROM tags WHERE id = ?", [
      "abc",
    ]);

    expect(knex.raw).toHaveBeenCalledWith("SELECT * FROM tags WHERE id = ?", [
      "abc",
    ]);
    expect(result).toEqual(rows);
  });

  it("execute should delegate to knex.raw without returning rows", async () => {
    const knex = makeKnex();
    const service = await buildService(knex);

    await service.execute("DELETE FROM tags WHERE id = ?", ["abc"]);

    expect(knex.raw).toHaveBeenCalledWith("DELETE FROM tags WHERE id = ?", [
      "abc",
    ]);
  });
});
