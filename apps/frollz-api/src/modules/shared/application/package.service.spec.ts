import { IPackageRepository } from "../../../domain/shared/repositories/package.repository.interface";
import { Package } from "../../../domain/shared/entities/package.entity";
import { PackageService } from "./package.service";

const makePkg = (id: number, name: string): Package =>
  Package.create({ id, name });

const makeRepo = (
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

describe("PackageService", () => {
  describe("findAll", () => {
    it("returns all packages from the repository", async () => {
      const packages = [makePkg(1, "Roll"), makePkg(2, "Sheet")];
      const service = new PackageService(
        makeRepo({ findAll: jest.fn().mockResolvedValue(packages) }),
      );

      const result = await service.findAll();

      expect(result).toEqual(packages);
    });

    it("returns empty array when no packages exist", async () => {
      const service = new PackageService(makeRepo());
      await expect(service.findAll()).resolves.toEqual([]);
    });

    it("delegates directly to the repository", async () => {
      const repo = makeRepo();
      const service = new PackageService(repo);

      await service.findAll();

      expect(repo.findAll).toHaveBeenCalledTimes(1);
    });
  });
});
