import { Test, TestingModule } from "@nestjs/testing";
import { StockTagService } from "./stock-tag.service";
import { DatabaseService } from "../database/database.service";

const makeDbService = (
  overrides: Partial<{ query: jest.Mock; execute: jest.Mock }> = {},
) => ({
  query: jest.fn().mockResolvedValue([]),
  execute: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const stockTagRow = (key: string) => ({
  id: key,
  stock_key: "kodak-portra-400-35mm",
  tag_key: "color",
  created_at: null,
});

describe("StockTagService", () => {
  let service: StockTagService;
  let db: ReturnType<typeof makeDbService>;

  beforeEach(async () => {
    db = makeDbService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockTagService, { provide: DatabaseService, useValue: db }],
    }).compile();

    service = module.get<StockTagService>(StockTagService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("should insert a stock-tag with createdAt and return it with _key", async () => {
      const result = await service.create({
        stockKey: "kodak-portra-400-35mm",
        tagKey: "color",
      });

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO stock_tags"),
        expect.arrayContaining(["kodak-portra-400-35mm", "color"]),
      );
      expect(result._key).toBeDefined();
      expect(result.stockKey).toBe("kodak-portra-400-35mm");
      expect(result.tagKey).toBe("color");
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("should not include updatedAt in the returned document", async () => {
      const result = await service.create({
        stockKey: "kodak-portra-400-35mm",
        tagKey: "color",
      });
      expect(result).not.toHaveProperty("updatedAt");
    });
  });

  describe("findAll", () => {
    it("should return all stock-tag associations mapped from rows", async () => {
      db.query.mockResolvedValue([stockTagRow("abc")]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        _key: "abc",
        stockKey: "kodak-portra-400-35mm",
        tagKey: "color",
      });
    });
  });

  describe("findByStock", () => {
    it("should query filtered by stock_key", async () => {
      await service.findByStock("kodak-portra-400-35mm");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("stock_key = ?"),
        ["kodak-portra-400-35mm"],
      );
    });

    it("should return the filtered results", async () => {
      db.query.mockResolvedValue([stockTagRow("abc")]);

      const result = await service.findByStock("kodak-portra-400-35mm");

      expect(result[0]).toMatchObject({
        _key: "abc",
        stockKey: "kodak-portra-400-35mm",
      });
    });
  });

  describe("findByTag", () => {
    it("should query filtered by tag_key", async () => {
      await service.findByTag("color");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("tag_key = ?"),
        ["color"],
      );
    });

    it("should return the filtered results", async () => {
      db.query.mockResolvedValue([stockTagRow("abc")]);

      const result = await service.findByTag("color");

      expect(result[0]).toMatchObject({ _key: "abc", tagKey: "color" });
    });
  });

  describe("findOne", () => {
    it("should return the stock-tag when found", async () => {
      db.query.mockResolvedValue([stockTagRow("abc")]);

      expect(await service.findOne("abc")).toMatchObject({ _key: "abc" });
    });

    it("should return null when not found", async () => {
      expect(await service.findOne("nonexistent")).toBeNull();
    });
  });

  describe("remove", () => {
    it("should return true when the record is deleted", async () => {
      db.query.mockResolvedValueOnce([{ id: "abc" }]);
      const result = await service.remove("abc");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM stock_tags"),
        ["abc"],
      );
      expect(result).toBe(true);
    });

    it("should return false when the record does not exist", async () => {
      db.query.mockResolvedValueOnce([]);
      const result = await service.remove("nonexistent");

      expect(result).toBe(false);
    });
  });
});
