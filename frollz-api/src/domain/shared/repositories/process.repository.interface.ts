import { Process } from '../entities/process.entity';

export const PROCESS_REPOSITORY = 'PROCESS_REPOSITORY';

export interface IProcessRepository {
  findById(id: number): Promise<Process | null>;
  findAll(): Promise<Process[]>;
  findByName(name: string): Promise<Process | null>;
  save(process: Process): Promise<void>;
  update(process: Process): Promise<void>;
  delete(id: number): Promise<void>;
}
