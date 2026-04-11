import { Format } from '../entities/format.entity';

export const FORMAT_REPOSITORY = 'FORMAT_REPOSITORY';

export interface IFormatRepository {
  findById(id: number): Promise<Format | null>;
  findAll(): Promise<Format[]>;
  findByPackageId(packageid: number): Promise<Format[]>;
  save(format: Format): Promise<void>;
  update(format: Format): Promise<void>;
  delete(id: number): Promise<void>;
}
