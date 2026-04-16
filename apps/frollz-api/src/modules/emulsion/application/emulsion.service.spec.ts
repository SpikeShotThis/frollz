import { randomInt } from "crypto";
import { NotFoundException } from "@nestjs/common";
import { EmulsionService } from "./emulsion.service";
import { IEmulsionRepository } from "../../../domain/emulsion/repositories/emulsion.repository.interface";
import { IEmulsionTagRepository } from "../../../domain/emulsion-tag/repositories/emulsion-tag.repository.interface";
import { Emulsion } from "../../../domain/emulsion/entities/emulsion.entity";

const randomId = () => randomInt(1, 1000000);

const makeEmulsion = (
  overrides: Partial<Parameters<typeof Emulsion.create>[0]> = {},
): Emulsion =>
  Emulsion.create({
    id: randomId(),
    brand: "Kodak",
    manufacturer: "Kodak",
    speed: 400,
    processId: randomId(),
    formatId: randomId(),
    parentId: null,
    ...overrides,
  });

const makeRepo = (
  overrides: Partial<IEmulsionRepository> = {},
): IEmulsionRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByBrand: jest.fn().mockResolvedValue(null),
  findByProcessId: jest.fn().mockResolvedValue([]),
  findByFormatId: jest.fn().mockResolvedValue([]),
  findBrands: jest.fn().mockResolvedValue([]),
  findManufacturers: jest.fn().mockResolvedValue([]),
  findSpeeds: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  updateBoxImage: jest.fn().mockResolvedValue(undefined),
  getBoxImage: jest.fn().mockResolvedValue(null),
  ...overrides,
});

const makeTagRepo = (
  overrides: Partial<IEmulsionTagRepository> = {},
): IEmulsionTagRepository => ({
  add: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("EmulsionService", () => {
  describe("findById", () => {
    it("returns the emulsion when found", async () => {
      const emulsion = makeEmulsion();
      const service = new EmulsionService(
        makeRepo({ findById: jest.fn().mockResolvedValue(emulsion) }),
        makeTagRepo(),
      );

      await expect(service.findById(emulsion.id)).resolves.toEqual(emulsion);
    });

    it("throws NotFoundException when not found", async () => {
      const service = new EmulsionService(makeRepo(), makeTagRepo());

      await expect(service.findById(randomId())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("saves and returns a new emulsion with a generated uuid", async () => {
      const savedEmulsion = makeEmulsion({ brand: "Kodak Portra 400" });
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(savedEmulsion),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      const result = await service.create({
        brand: "Kodak Portra 400",
        manufacturer: "Kodak",
        speed: 400,
        processId: randomId(),
        formatId: randomId(),
      });

      expect(result.brand).toBe("Kodak Portra 400");
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ brand: "Kodak Portra 400" }),
      );
    });
  });

  describe("createMultipleFormats", () => {
    it("creates one emulsion per formatId", async () => {
      const formatIds = [randomId(), randomId()];
      const emulsions = formatIds.map((formatId) => makeEmulsion({ formatId }));
      const repo = makeRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(emulsions[0])
          .mockResolvedValueOnce(emulsions[1]),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      const results = await service.createMultipleFormats({
        brand: "Ilford HP5",
        manufacturer: "Ilford",
        speed: 400,
        processId: randomId(),
        formatIds,
      });

      expect(results).toHaveLength(2);
      expect(results[0].formatId).toBe(formatIds[0]);
      expect(results[1].formatId).toBe(formatIds[1]);
      expect(repo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe("update", () => {
    it("merges partial changes onto the existing emulsion", async () => {
      const existing = makeEmulsion();
      const afterUpdate = makeEmulsion({ id: existing.id, speed: 800 });
      const repo = makeRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(afterUpdate),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      const result = await service.update(existing.id, { speed: 800 });

      expect(repo.update).toHaveBeenCalled();
      expect(result.speed).toBe(800);
    });

    it("throws NotFoundException when emulsion not found", async () => {
      const service = new EmulsionService(makeRepo(), makeTagRepo());

      await expect(service.update(randomId(), { speed: 800 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("addTag / removeTag", () => {
    it("adds a tag association to an existing emulsion", async () => {
      const emulsion = makeEmulsion();
      const tagRepo = makeTagRepo();
      const tagId = randomId();
      const service = new EmulsionService(
        makeRepo({ findById: jest.fn().mockResolvedValue(emulsion) }),
        tagRepo,
      );

      await service.addTag(emulsion.id, tagId);

      expect(tagRepo.add).toHaveBeenCalledWith(emulsion.id, tagId);
    });

    it("removes a tag association from an existing emulsion", async () => {
      const emulsion = makeEmulsion();
      const tagRepo = makeTagRepo();
      const tagId = randomId();
      const service = new EmulsionService(
        makeRepo({ findById: jest.fn().mockResolvedValue(emulsion) }),
        tagRepo,
      );

      await service.removeTag(emulsion.id, tagId);

      expect(tagRepo.remove).toHaveBeenCalledWith(emulsion.id, tagId);
    });

    it("throws NotFoundException when emulsion not found", async () => {
      const service = new EmulsionService(makeRepo(), makeTagRepo());

      await expect(service.addTag(randomId(), randomId())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("typeahead", () => {
    it("delegates findBrands with query to repository", async () => {
      const repo = makeRepo({
        findBrands: jest.fn().mockResolvedValue(["Kodak", "Ilford"]),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      const result = await service.findBrands("Ko");

      expect(result).toEqual(["Kodak", "Ilford"]);
      expect(repo.findBrands).toHaveBeenCalledWith("Ko");
    });

    it("delegates findBrands without query to repository", async () => {
      const repo = makeRepo({
        findBrands: jest.fn().mockResolvedValue(["Kodak", "Ilford", "Fuji"]),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      const result = await service.findBrands();

      expect(result).toEqual(["Kodak", "Ilford", "Fuji"]);
      expect(repo.findBrands).toHaveBeenCalledWith(undefined);
    });

    it("delegates findManufacturers with query to repository", async () => {
      const repo = makeRepo({
        findManufacturers: jest.fn().mockResolvedValue(["Kodak"]),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      const result = await service.findManufacturers("Ko");

      expect(result).toEqual(["Kodak"]);
      expect(repo.findManufacturers).toHaveBeenCalledWith("Ko");
    });

    it("delegates findManufacturers without query to repository", async () => {
      const repo = makeRepo({
        findManufacturers: jest.fn().mockResolvedValue(["Kodak", "Ilford"]),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      await service.findManufacturers();

      expect(repo.findManufacturers).toHaveBeenCalledWith(undefined);
    });

    it("delegates findSpeeds with query to repository", async () => {
      const repo = makeRepo({ findSpeeds: jest.fn().mockResolvedValue([400]) });
      const service = new EmulsionService(repo, makeTagRepo());

      const result = await service.findSpeeds("4");

      expect(result).toEqual([400]);
      expect(repo.findSpeeds).toHaveBeenCalledWith("4");
    });

    it("delegates findSpeeds without query to repository", async () => {
      const repo = makeRepo({
        findSpeeds: jest.fn().mockResolvedValue([100, 200, 400]),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      await service.findSpeeds();

      expect(repo.findSpeeds).toHaveBeenCalledWith(undefined);
    });
  });

  describe("findAll", () => {
    it("returns all emulsions from the repository", async () => {
      const emulsions = [makeEmulsion(), makeEmulsion({ brand: "Ilford HP5" })];
      const repo = makeRepo({
        findAll: jest.fn().mockResolvedValue(emulsions),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      const result = await service.findAll();

      expect(result).toEqual(emulsions);
    });

    it("returns empty array when no emulsions exist", async () => {
      const service = new EmulsionService(makeRepo(), makeTagRepo());
      await expect(service.findAll()).resolves.toEqual([]);
    });
  });

  describe("delete", () => {
    it("deletes an existing emulsion", async () => {
      const emulsion = makeEmulsion();
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(emulsion),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      await service.delete(emulsion.id);

      expect(repo.delete).toHaveBeenCalledWith(emulsion.id);
    });

    it("throws NotFoundException when emulsion does not exist", async () => {
      const service = new EmulsionService(makeRepo(), makeTagRepo());

      await expect(service.delete(randomId())).rejects.toThrow(
        NotFoundException,
      );
    });

    it("does not call delete when emulsion is not found", async () => {
      const repo = makeRepo();
      const service = new EmulsionService(repo, makeTagRepo());

      await expect(service.delete(randomId())).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe("uploadBoxImage / getBoxImage", () => {
    it("uploads a box image for an existing emulsion", async () => {
      const emulsion = makeEmulsion();
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(emulsion),
      });
      const service = new EmulsionService(repo, makeTagRepo());
      const buf = Buffer.from("fake-image");

      await service.uploadBoxImage(emulsion.id, buf, "image/jpeg");

      expect(repo.updateBoxImage).toHaveBeenCalledWith(
        emulsion.id,
        buf,
        "image/jpeg",
      );
    });

    it("throws NotFoundException when uploading image for missing emulsion", async () => {
      const service = new EmulsionService(makeRepo(), makeTagRepo());

      await expect(
        service.uploadBoxImage(randomId(), Buffer.from("x"), "image/jpeg"),
      ).rejects.toThrow(NotFoundException);
    });

    it("returns box image data for an existing emulsion", async () => {
      const emulsion = makeEmulsion();
      const imageData = { data: Buffer.from("img"), mimeType: "image/jpeg" };
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(emulsion),
        getBoxImage: jest.fn().mockResolvedValue(imageData),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      const result = await service.getBoxImage(emulsion.id);

      expect(result).toEqual(imageData);
    });

    it("throws NotFoundException when no box image has been set", async () => {
      const emulsion = makeEmulsion();
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(emulsion),
        getBoxImage: jest.fn().mockResolvedValue(null),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      await expect(service.getBoxImage(emulsion.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException when emulsion does not exist for getBoxImage", async () => {
      const service = new EmulsionService(makeRepo(), makeTagRepo());

      await expect(service.getBoxImage(randomId())).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
