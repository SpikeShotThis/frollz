import { Package } from "../entities/package.entity";

export const PACKAGE_REPOSITORY = "PACKAGE_REPOSITORY";

export interface IPackageRepository {
  findById(id: number): Promise<Package | null>;
  findAll(): Promise<Package[]>;
  findByName(name: string): Promise<Package | null>;
  save(pkg: Package): Promise<void>;
  update(pkg: Package): Promise<void>;
  delete(id: number): Promise<void>;
}
