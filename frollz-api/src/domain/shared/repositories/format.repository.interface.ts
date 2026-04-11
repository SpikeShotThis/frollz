import { Format } from '../entities/format.entity';

export const FORMAT_REPOSITORY = 'FORMAT_REPOSITORY';

export interface IFormatRepository {
  findById(id: number): Promise<Format | null>;
  findAll(): Promise<Format[]>;
  findByPackageId(packageId: number): Promise<Format[]>;
  save(format: Format): Promise<number>;
  update(format: Format): Promise<void>;
  delete(id: number): Promise<void>;
}
