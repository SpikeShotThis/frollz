import { ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { StockService } from "./stock.service";
import { DatabaseService } from "../database/database.service";
import { Process } from "./entities/stock.entity";

const makeDbService = (
  overrides: Partial<{ query: jest.Mock; execute: jest.Mock }> = {},
) => ({
  query: jest.fn().mockResolvedValue([]),
  execute: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("StockService", () => {
  let service: StockService;
  let db: ReturnType<typeof makeDbService>;

  beforeEach(async () => {
    db = makeDbService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockService, { provide: DatabaseService, useValue: db }],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("getBrands", () => {
    it("should query using LIKE on brand with the provided query", async () => {
      await service.getBrands("por");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("LIKE"),
        expect.arrayContaining(["%por%"]),
      );
    });

    it("should use DISTINCT to avoid duplicate brand names", async () => {
      await service.getBrands("por");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("DISTINCT"),
        expect.anything(),
      );
    });

    it("should return matching brand names from rows", async () => {
      db.query.mockResolvedValue([
        { brand: "Portra 400" },
        { brand: "Portra 800" },
      ]);

      const result = await service.getBrands("por");

      expect(result).toEqual(["Portra 400", "Portra 800"]);
    });

    it("should return an empty array when no brands match", async () => {
      db.query.mockResolvedValue([]);

      expect(await service.getBrands("zzz")).toEqual([]);
    });

    it("should pass an empty string query when called with empty string", async () => {
      await service.getBrands("");

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(["%%"]),
      );
    });
  });

  describe("getManufacturers", () => {
    it("should query using LIKE on manufacturer with the provided query", async () => {
      await service.getManufacturers("kod");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("manufacturer"),
        expect.arrayContaining(["%kod%"]),
      );
    });

    it("should use DISTINCT to avoid duplicate manufacturer names", async () => {
      await service.getManufacturers("kod");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("DISTINCT"),
        expect.anything(),
      );
    });

    it("should return matching manufacturer names from rows", async () => {
      db.query.mockResolvedValue([
        { manufacturer: "Kodak" },
        { manufacturer: "Konica" },
      ]);

      expect(await service.getManufacturers("ko")).toEqual(["Kodak", "Konica"]);
    });

    it("should return an empty array when no manufacturers match", async () => {
      expect(await service.getManufacturers("zzz")).toEqual([]);
    });
  });

  describe("createMultipleFormats", () => {
    const dto = {
      formatKeys: ["35mm", "120"],
      process: Process.C_41,
      manufacturer: "Kodak",
      brand: "Portra 400",
      speed: 400,
    };

    it("should execute an INSERT for each formatKey", async () => {
      await service.createMultipleFormats(dto);

      expect(db.execute).toHaveBeenCalledTimes(2);
    });

    it("should generate _key as {manufacturer}-{brand}-{speed}-{formatKey}", async () => {
      const results = await service.createMultipleFormats(dto);

      expect(results[0]._key).toBe("kodak-portra-400-400-35mm");
      expect(results[1]._key).toBe("kodak-portra-400-400-120");
    });

    it("should lowercase and dasherize manufacturer and brand in the key", async () => {
      const results = await service.createMultipleFormats({
        ...dto,
        manufacturer: "Fuji Film",
        brand: "Pro 400H",
      });

      expect(results[0]._key).toBe("fuji-film-pro-400h-400-35mm");
    });

    it("should set formatKey on each created stock", async () => {
      const results = await service.createMultipleFormats(dto);

      expect(results[0].formatKey).toBe("35mm");
      expect(results[1].formatKey).toBe("120");
    });

    it("should create a single stock when only one formatKey is provided", async () => {
      const results = await service.createMultipleFormats({
        ...dto,
        formatKeys: ["35mm"],
      });

      expect(db.execute).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
    });
  });

  describe("getSpeeds", () => {
    it("should query using LIKE on speed cast to text", async () => {
      await service.getSpeeds("40");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("speed::text"),
        expect.arrayContaining(["%40%"]),
      );
    });

    it("should use DISTINCT to avoid duplicate speed values", async () => {
      await service.getSpeeds("40");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("DISTINCT"),
        expect.anything(),
      );
    });

    it("should return matching speeds from rows as numbers", async () => {
      db.query.mockResolvedValue([{ speed: 400 }, { speed: 800 }]);

      expect(await service.getSpeeds("4")).toEqual([400, 800]);
    });

    it("should return an empty array when no speeds match", async () => {
      expect(await service.getSpeeds("999")).toEqual([]);
    });
  });

  describe("remove", () => {
    it("should return true when the record is deleted", async () => {
      db.query
        .mockResolvedValueOnce([]) // no roll dependents
        .mockResolvedValueOnce([]) // no stock_tag dependents
        .mockResolvedValueOnce([{ id: "kodak-gold-200" }]); // DELETE RETURNING
      const result = await service.remove("kodak-gold-200");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM stocks"),
        ["kodak-gold-200"],
      );
      expect(result).toBe(true);
    });

    it("should return false when the record does not exist", async () => {
      db.query
        .mockResolvedValueOnce([]) // no roll dependents
        .mockResolvedValueOnce([]) // no stock_tag dependents
        .mockResolvedValueOnce([]); // DELETE RETURNING — nothing deleted
      const result = await service.remove("nonexistent");

      expect(result).toBe(false);
    });

    it("should throw ConflictException when rolls reference the stock", async () => {
      db.query.mockResolvedValueOnce([{ id: "roll-1" }]); // roll dependent found

      await expect(service.remove("kodak-gold-200")).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw ConflictException when stock_tags reference the stock", async () => {
      db.query
        .mockResolvedValueOnce([]) // no roll dependents
        .mockResolvedValueOnce([{ id: "st-1" }]); // stock_tag dependent found

      await expect(service.remove("kodak-gold-200")).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
