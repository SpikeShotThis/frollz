import { Emulsion } from '../entities/emulsion.entity';

export const EMULSION_REPOSITORY = 'EMULSION_REPOSITORY';

export interface IEmulsionRepository {
  findById(id: number): Promise<Emulsion | null>;
  findAll(): Promise<Emulsion[]>;
  findByBrand(brand: string): Promise<Emulsion | null>;
  findByProcessId(processId: number): Promise<Emulsion[]>;
  findByFormatId(formatId: number): Promise<Emulsion[]>;
  findBrands(q?: string): Promise<string[]>;
  findManufacturers(q?: string): Promise<string[]>;
  findSpeeds(q?: string): Promise<number[]>;
  save(emulsion: Emulsion): Promise<number>;
  update(emulsion: Emulsion): Promise<void>;
  delete(id: number): Promise<void>;
  updateBoxImage(id: number, data: Buffer, mimeType: string): Promise<void>;
  getBoxImage(id: number): Promise<{ data: Buffer; mimeType: string } | null>;
}
