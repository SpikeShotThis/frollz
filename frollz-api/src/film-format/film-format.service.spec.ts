import { ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FilmFormatService } from "./film-format.service";
import { DatabaseService } from "../database/database.service";

const makeDbService = (
  overrides: Partial<{ query: jest.Mock; execute: jest.Mock }> = {},
) => ({
  query: jest.fn().mockResolvedValue([]),
  execute: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("FilmFormatService", () => {
  let service: FilmFormatService;
  let db: ReturnType<typeof makeDbService>;

  beforeEach(async () => {
    db = makeDbService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilmFormatService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();

    service = module.get<FilmFormatService>(FilmFormatService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("remove", () => {
    it("should return true when the record is deleted", async () => {
      db.query
        .mockResolvedValueOnce([]) // no stock dependents
        .mockResolvedValueOnce([{ id: "35mm" }]); // DELETE RETURNING
      const result = await service.remove("35mm");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM film_formats"),
        ["35mm"],
      );
      expect(result).toBe(true);
    });

    it("should return false when the record does not exist", async () => {
      db.query
        .mockResolvedValueOnce([]) // no stock dependents
        .mockResolvedValueOnce([]); // DELETE RETURNING — nothing deleted
      const result = await service.remove("nonexistent");

      expect(result).toBe(false);
    });

    it("should throw ConflictException when stocks reference the format", async () => {
      db.query.mockResolvedValueOnce([{ id: "stock-1" }]); // stock dependent found

      await expect(service.remove("35mm")).rejects.toThrow(ConflictException);
    });
  });
});
