import { Package } from '../entities/package.entity';

export const PACKAGE_REPOSITORY = 'PACKAGE_REPOSITORY';

export interface IPackageRepository {
  findById(id: string): Promise<Package | null>;
  findAll(): Promise<Package[]>;
  findByName(name: string): Promise<Package | null>;
  save(pkg: Package): Promise<void>;
  update(pkg: Package): Promise<void>;
  delete(id: string): Promise<void>;
}
