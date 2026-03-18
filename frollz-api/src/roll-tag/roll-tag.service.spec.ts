import { Test, TestingModule } from "@nestjs/testing";
import { RollTagService } from "./roll-tag.service";
import { DatabaseService } from "../database/database.service";

const makeDbService = (
  overrides: Partial<{ query: jest.Mock; execute: jest.Mock }> = {},
) => ({
  query: jest.fn().mockResolvedValue([]),
  execute: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const rollTagRow = (key: string) => ({
  id: key,
  roll_key: "roll-portra-400-2024-01-01",
  tag_key: "color",
  created_at: null,
});

describe("RollTagService", () => {
  let service: RollTagService;
  let db: ReturnType<typeof makeDbService>;

  beforeEach(async () => {
    db = makeDbService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [RollTagService, { provide: DatabaseService, useValue: db }],
    }).compile();

    service = module.get<RollTagService>(RollTagService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("should insert a roll-tag with createdAt and return it with _key", async () => {
      const result = await service.create({
        rollKey: "roll-portra-400-2024-01-01",
        tagKey: "color",
      });

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO roll_tags"),
        expect.arrayContaining(["roll-portra-400-2024-01-01", "color"]),
      );
      expect(result._key).toBeDefined();
      expect(result.rollKey).toBe("roll-portra-400-2024-01-01");
      expect(result.tagKey).toBe("color");
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("should not include updatedAt in the returned document", async () => {
      const result = await service.create({
        rollKey: "roll-portra-400-2024-01-01",
        tagKey: "color",
      });
      expect(result).not.toHaveProperty("updatedAt");
    });
  });

  describe("findAll", () => {
    it("should return all roll-tag associations mapped from rows", async () => {
      db.query.mockResolvedValue([rollTagRow("abc")]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        _key: "abc",
        rollKey: "roll-portra-400-2024-01-01",
        tagKey: "color",
      });
    });
  });

  describe("findByRoll", () => {
    it("should query filtered by roll_key", async () => {
      await service.findByRoll("roll-portra-400-2024-01-01");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("roll_key = ?"),
        ["roll-portra-400-2024-01-01"],
      );
    });

    it("should return the filtered results", async () => {
      db.query.mockResolvedValue([rollTagRow("abc")]);

      const result = await service.findByRoll("roll-portra-400-2024-01-01");

      expect(result[0]).toMatchObject({
        _key: "abc",
        rollKey: "roll-portra-400-2024-01-01",
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
      db.query.mockResolvedValue([rollTagRow("abc")]);

      const result = await service.findByTag("color");

      expect(result[0]).toMatchObject({ _key: "abc", tagKey: "color" });
    });
  });

  describe("findOne", () => {
    it("should return the roll-tag when found", async () => {
      db.query.mockResolvedValue([rollTagRow("abc")]);

      expect(await service.findOne("abc")).toMatchObject({ _key: "abc" });
    });

    it("should return null when not found", async () => {
      expect(await service.findOne("nonexistent")).toBeNull();
    });
  });

  describe("remove", () => {
    it("should execute DELETE and return true", async () => {
      const result = await service.remove("abc");

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM roll_tags"),
        ["abc"],
      );
      expect(result).toBe(true);
    });
  });
});
