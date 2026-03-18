import { Test, TestingModule } from "@nestjs/testing";
import { TagService } from "./tag.service";
import { DatabaseService } from "../database/database.service";

const makeDbService = (
  overrides: Partial<{ query: jest.Mock; execute: jest.Mock }> = {},
) => ({
  query: jest.fn().mockResolvedValue([]),
  execute: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("TagService", () => {
  let service: TagService;
  let db: ReturnType<typeof makeDbService>;

  beforeEach(async () => {
    db = makeDbService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagService, { provide: DatabaseService, useValue: db }],
    }).compile();

    service = module.get<TagService>(TagService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("should insert a tag with createdAt and return it with _key", async () => {
      const result = await service.create({ value: "color", color: "#F97316" });

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO tags"),
        expect.arrayContaining(["color", "#F97316"]),
      );
      expect(result).toMatchObject({ value: "color", color: "#F97316" });
      expect(result._key).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("should default isRollScoped and isStockScoped to true when not provided", async () => {
      const result = await service.create({ value: "color", color: "#F97316" });

      expect(result.isRollScoped).toBe(true);
      expect(result.isStockScoped).toBe(true);
    });

    it("should respect explicit isRollScoped and isStockScoped values", async () => {
      const result = await service.create({
        value: "roll-only",
        color: "#F97316",
        isRollScoped: true,
        isStockScoped: false,
      });

      expect(result.isRollScoped).toBe(true);
      expect(result.isStockScoped).toBe(false);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("is_roll_scoped"),
        expect.arrayContaining([true, false]),
      );
    });

    it("should not include updatedAt in the returned document", async () => {
      const result = await service.create({
        value: "portrait",
        color: "#EC4899",
      });
      expect(result).not.toHaveProperty("updatedAt");
    });
  });

  describe("findAll", () => {
    it("should return all tags mapped from rows", async () => {
      db.query.mockResolvedValue([
        {
          id: "color",
          value: "color",
          color: "#F97316",
          is_roll_scoped: true,
          is_stock_scoped: true,
          created_at: new Date(),
        },
        {
          id: "portrait",
          value: "portrait",
          color: "#EC4899",
          is_roll_scoped: false,
          is_stock_scoped: true,
          created_at: new Date(),
        },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]._key).toBe("color");
      expect(result[0].value).toBe("color");
      expect(result[0].isRollScoped).toBe(true);
      expect(result[1].isRollScoped).toBe(false);
    });

    it("should query with ORDER BY value ASC", async () => {
      await service.findAll();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY value ASC"),
      );
    });
  });

  describe("findOne", () => {
    it("should return the tag when found", async () => {
      db.query.mockResolvedValue([
        {
          id: "color",
          value: "color",
          color: "#F97316",
          is_roll_scoped: true,
          is_stock_scoped: false,
          created_at: null,
        },
      ]);

      const result = await service.findOne("color");

      expect(result).toMatchObject({
        _key: "color",
        value: "color",
        color: "#F97316",
        isRollScoped: true,
        isStockScoped: false,
      });
    });

    it("should return null when not found", async () => {
      db.query.mockResolvedValue([]);
      expect(await service.findOne("nonexistent")).toBeNull();
    });

    it("should filter by the provided key", async () => {
      await service.findOne("color");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = ?"),
        ["color"],
      );
    });
  });

  describe("update", () => {
    it("should execute UPDATE and return the refreshed tag", async () => {
      db.query.mockResolvedValueOnce([
        {
          id: "color",
          value: "color",
          color: "#FFFFFF",
          is_roll_scoped: true,
          is_stock_scoped: true,
          created_at: null,
        },
      ]);

      const result = await service.update("color", { color: "#FFFFFF" });

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE tags SET"),
        expect.arrayContaining(["#FFFFFF", "color"]),
      );
      expect(result).toMatchObject({ _key: "color", color: "#FFFFFF" });
    });

    it("should include updated_at in UPDATE when fields are changed", async () => {
      db.query.mockResolvedValueOnce([
        {
          id: "color",
          value: "color",
          color: "#F97316",
          is_roll_scoped: true,
          is_stock_scoped: true,
          created_at: null,
          updated_at: new Date(),
        },
      ]);

      await service.update("color", { color: "#FFFFFF" });

      const [sql, values] = db.execute.mock.calls[0];
      expect(sql).toContain("updated_at");
      expect(values).toContainEqual(expect.any(Date));
    });

    it("should update isRollScoped and isStockScoped", async () => {
      db.query.mockResolvedValueOnce([
        {
          id: "color",
          value: "color",
          color: "#F97316",
          is_roll_scoped: false,
          is_stock_scoped: true,
          created_at: null,
        },
      ]);

      await service.update("color", {
        isRollScoped: false,
        isStockScoped: true,
      });

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("is_roll_scoped"),
        expect.arrayContaining([false, true]),
      );
    });

    it("should return findOne result even if update has no fields", async () => {
      db.query.mockResolvedValue([
        {
          id: "color",
          value: "color",
          color: "#F97316",
          is_roll_scoped: true,
          is_stock_scoped: true,
          created_at: null,
        },
      ]);

      const result = await service.update("color", {});
      expect(result).toMatchObject({ _key: "color" });
      expect(db.execute).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should execute DELETE and return true", async () => {
      const result = await service.remove("color");

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM tags"),
        ["color"],
      );
      expect(result).toBe(true);
    });
  });
});
