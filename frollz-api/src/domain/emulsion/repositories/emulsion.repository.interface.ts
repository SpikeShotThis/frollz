import { Emulsion } from '../entities/emulsion.entity';

export const EMULSION_REPOSITORY = 'EMULSION_REPOSITORY';

export interface IEmulsionRepository {
  findById(id: number): Promise<Emulsion | null>;
  findAll(): Promise<Emulsion[]>;
  findByProcess(processid: number): Promise<Emulsion[]>;
  findByFormat(formatid: number): Promise<Emulsion[]>;
  findBrands(q?: string): Promise<string[]>;
  findManufacturers(q?: string): Promise<string[]>;
  findSpeeds(q?: string): Promise<number[]>;
  save(emulsion: Emulsion): Promise<void>;
  update(emulsion: Emulsion): Promise<void>;
  delete(id: number): Promise<void>;
}
