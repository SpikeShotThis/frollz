import { Format } from '../entities/format.entity';

export const FORMAT_REPOSITORY = 'FORMAT_REPOSITORY';

export interface IFormatRepository {
  findById(id: string): Promise<Format | null>;
  findAll(): Promise<Format[]>;
  findByPackageId(packageId: string): Promise<Format[]>;
  save(format: Format): Promise<void>;
  update(format: Format): Promise<void>;
  delete(id: string): Promise<void>;
}
