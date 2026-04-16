import { randomInt } from "crypto";
import { NotFoundException } from "@nestjs/common";
import { FormatService } from "./format.service";
import { IFormatRepository } from "../../../domain/shared/repositories/format.repository.interface";
import { IPackageRepository } from "../../../domain/shared/repositories/package.repository.interface";
import { Format } from "../../../domain/shared/entities/format.entity";
import { Package } from "../../../domain/shared/entities/package.entity";

const randomId = () => randomInt(1, 1_000_000);

const makePkg = (
  overrides: Partial<{ id: number; name: string }> = {},
): Package => Package.create({ id: randomId(), name: "Roll", ...overrides });

const makeFormat = (
  overrides: Partial<Parameters<typeof Format.create>[0]> = {},
): Format =>
  Format.create({
    id: randomId(),
    packageId: randomId(),
    name: "35mm",
    ...overrides,
  });

const makeFormatRepo = (
  overrides: Partial<IFormatRepository> = {},
): IFormatRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByPackageId: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makePackageRepo = (
  overrides: Partial<IPackageRepository> = {},
): IPackageRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeService = (
  formatRepo: IFormatRepository = makeFormatRepo(),
  packageRepo: IPackageRepository = makePackageRepo(),
) => new FormatService(formatRepo, packageRepo);

describe("FormatService", () => {
  describe("findAll", () => {
    it("returns all formats enriched with their package", async () => {
      const pkg = makePkg({ name: "Roll" });
      const format = makeFormat({ packageId: pkg.id });
      const service = makeService(
        makeFormatRepo({ findAll: jest.fn().mockResolvedValue([format]) }),
        makePackageRepo({ findById: jest.fn().mockResolvedValue(pkg) }),
      );

      const results = await service.findAll();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("35mm");
      expect(results[0].pkg).toEqual(pkg);
    });

    it("returns empty array when no formats exist", async () => {
      const service = makeService();
      await expect(service.findAll()).resolves.toEqual([]);
    });

    it("attaches undefined pkg when package is not found", async () => {
      const format = makeFormat();
      const service = makeService(
        makeFormatRepo({ findAll: jest.fn().mockResolvedValue([format]) }),
        makePackageRepo({ findById: jest.fn().mockResolvedValue(null) }),
      );

      const results = await service.findAll();
      expect(results[0].pkg).toBeUndefined();
    });
  });

  describe("findById", () => {
    it("returns the format enriched with its package when found", async () => {
      const pkg = makePkg();
      const format = makeFormat({ packageId: pkg.id });
      const service = makeService(
        makeFormatRepo({ findById: jest.fn().mockResolvedValue(format) }),
        makePackageRepo({ findById: jest.fn().mockResolvedValue(pkg) }),
      );

      const result = await service.findById(format.id);

      expect(result.id).toBe(format.id);
      expect(result.name).toBe(format.name);
      expect(result.pkg).toEqual(pkg);
    });

    it("throws NotFoundException when format does not exist", async () => {
      const service = makeService();
      await expect(service.findById(randomId())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("saves and returns the new format", async () => {
      const pkg = makePkg();
      const savedId = randomId();
      const saved = makeFormat({ id: savedId, packageId: pkg.id, name: "120" });
      const service = makeService(
        makeFormatRepo({
          save: jest.fn().mockResolvedValue(savedId),
          findById: jest.fn().mockResolvedValue(saved),
        }),
        makePackageRepo({ findById: jest.fn().mockResolvedValue(pkg) }),
      );

      const result = await service.create({ packageId: pkg.id, name: "120" });

      expect(result.name).toBe("120");
      expect(result.packageId).toBe(pkg.id);
    });

    it("calls save with the correct format data", async () => {
      const pkg = makePkg({ id: 7 });
      const savedId = randomId();
      const saved = makeFormat({ id: savedId, packageId: 7, name: "4x5" });
      const formatRepo = makeFormatRepo({
        save: jest.fn().mockResolvedValue(savedId),
        findById: jest.fn().mockResolvedValue(saved),
      });
      const service = makeService(
        formatRepo,
        makePackageRepo({ findById: jest.fn().mockResolvedValue(pkg) }),
      );

      await service.create({ packageId: 7, name: "4x5" });

      expect(formatRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ packageId: 7, name: "4x5" }),
      );
    });
  });

  describe("update", () => {
    it("applies a name change and saves", async () => {
      const pkg = makePkg();
      const existing = makeFormat({ packageId: pkg.id, name: "35mm" });
      const service = makeService(
        makeFormatRepo({ findById: jest.fn().mockResolvedValue(existing) }),
        makePackageRepo({ findById: jest.fn().mockResolvedValue(pkg) }),
      );

      const result = await service.update(existing.id, { name: "120" });

      expect(result.name).toBe("120");
    });

    it("preserves packageId when only name is updated", async () => {
      const pkg = makePkg({ id: 5 });
      const existing = makeFormat({ packageId: 5, name: "35mm" });
      const service = makeService(
        makeFormatRepo({ findById: jest.fn().mockResolvedValue(existing) }),
        makePackageRepo({ findById: jest.fn().mockResolvedValue(pkg) }),
      );

      const result = await service.update(existing.id, { name: "120" });

      expect(result.packageId).toBe(5);
    });

    it("calls formatRepo.update with updated data", async () => {
      const pkg = makePkg({ id: 3 });
      const existing = makeFormat({ packageId: 3, name: "35mm" });
      const formatRepo = makeFormatRepo({
        findById: jest.fn().mockResolvedValue(existing),
      });
      const service = makeService(
        formatRepo,
        makePackageRepo({ findById: jest.fn().mockResolvedValue(pkg) }),
      );

      await service.update(existing.id, { name: "120" });

      expect(formatRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: "120", packageId: 3 }),
      );
    });

    it("throws NotFoundException when format does not exist", async () => {
      const service = makeService();
      await expect(service.update(randomId(), { name: "120" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("delete", () => {
    it("deletes an existing format", async () => {
      const format = makeFormat();
      const formatRepo = makeFormatRepo({
        findById: jest.fn().mockResolvedValue(format),
      });
      const service = makeService(formatRepo);

      await service.delete(format.id);

      expect(formatRepo.delete).toHaveBeenCalledWith(format.id);
    });

    it("throws NotFoundException when format does not exist", async () => {
      const service = makeService();
      await expect(service.delete(randomId())).rejects.toThrow(
        NotFoundException,
      );
    });

    it("does not call delete when format is not found", async () => {
      const formatRepo = makeFormatRepo();
      const service = makeService(formatRepo);

      await expect(service.delete(randomId())).rejects.toThrow(
        NotFoundException,
      );
      expect(formatRepo.delete).not.toHaveBeenCalled();
    });
  });
});
