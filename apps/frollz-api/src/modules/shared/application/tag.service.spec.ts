import { randomInt } from "crypto";
import { NotFoundException } from "@nestjs/common";
import { TagService } from "./tag.service";
import { ITagRepository } from "../../../domain/shared/repositories/tag.repository.interface";
import { Tag } from "../../../domain/shared/entities/tag.entity";

const randomId = () => randomInt(1, 1000000);

const makeTag = (
  overrides: Partial<{
    id: number;
    name: string;
    colorCode: string;
    description: string | null;
  }> = {},
): Tag =>
  Tag.create({
    id: randomId(),
    name: "Expired",
    colorCode: "#ff0000",
    description: null,
    ...overrides,
  });

const makeRepo = (overrides: Partial<ITagRepository> = {}): ITagRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("TagService", () => {
  describe("findAll", () => {
    it("returns all tags from the repository", async () => {
      const tag = makeTag();
      const repo = makeRepo({ findAll: jest.fn().mockResolvedValue([tag]) });
      const service = new TagService(repo);

      const result = await service.findAll();

      expect(result).toEqual([tag]);
    });
  });

  describe("findById", () => {
    it("returns the tag when found", async () => {
      const tag = makeTag();
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(tag) });
      const service = new TagService(repo);

      await expect(service.findById(tag.id)).resolves.toEqual(tag);
    });

    it("throws NotFoundException when tag does not exist", async () => {
      const service = new TagService(makeRepo());

      await expect(service.findById(randomId())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("saves and returns a new tag with a generated uuid", async () => {
      const savedTag = makeTag({ name: "Expired", colorCode: "#ff0000" });
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(savedTag),
      });
      const service = new TagService(repo);

      const result = await service.create({
        name: "Expired",
        colorCode: "#ff0000",
      });

      expect(result.name).toBe("Expired");
      expect(result.colorCode).toBe("#ff0000");
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Expired", colorCode: "#ff0000" }),
      );
    });
  });

  describe("update", () => {
    it("applies partial changes and saves", async () => {
      const existing = makeTag();
      const updated = makeTag({
        id: existing.id,
        name: "Pushed",
        colorCode: existing.colorCode,
      });
      const repo = makeRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(updated),
      });
      const service = new TagService(repo);

      const result = await service.update(existing.id, { name: "Pushed" });

      expect(result.name).toBe("Pushed");
      expect(result.colorCode).toBe(existing.colorCode);
      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Pushed" }),
      );
    });

    it("throws NotFoundException for a missing tag", async () => {
      const service = new TagService(makeRepo());

      await expect(service.update(randomId(), { name: "x" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("delete", () => {
    it("deletes an existing tag", async () => {
      const tag = makeTag();
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(tag) });
      const service = new TagService(repo);

      await service.delete(tag.id);

      expect(repo.delete).toHaveBeenCalledWith(tag.id);
    });

    it("throws NotFoundException when tag does not exist", async () => {
      const service = new TagService(makeRepo());

      await expect(service.delete(randomId())).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
