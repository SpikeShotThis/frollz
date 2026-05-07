import { Inject, Injectable } from '@nestjs/common';
import type { CreateEmulsionRequest, Emulsion, UpdateEmulsionRequest } from '@frollz2/schema';
import { DomainError } from '../../domain/errors.js';
import { EmulsionRepository } from '../../infrastructure/repositories/emulsion.repository.js';
import { ReferenceService } from '../reference/reference.service.js';

@Injectable()
export class EmulsionsService {
  constructor(
    @Inject(EmulsionRepository) private readonly emulsionRepository: EmulsionRepository,
    @Inject(ReferenceService) private readonly referenceService: ReferenceService
  ) { }

  list(): Promise<Emulsion[]> {
    return this.emulsionRepository.list();
  }

  async findById(id: number): Promise<Emulsion> {
    const emulsion = await this.emulsionRepository.findById(id);
    if (!emulsion) {
      throw new DomainError('NOT_FOUND', 'Emulsion not found', { label: 'errors.emulsions.notFound' });
    }
    return emulsion;
  }

  async create(userId: number, input: CreateEmulsionRequest): Promise<Emulsion> {
    const emulsion = await this.emulsionRepository.create(input);
    await this.referenceService.upsertReferenceValues(userId, [
      { kind: 'manufacturer', value: input.manufacturer },
      { kind: 'brand', value: input.brand }
    ]);
    return emulsion;
  }

  async update(userId: number, id: number, input: UpdateEmulsionRequest): Promise<Emulsion> {
    const emulsion = await this.emulsionRepository.update(id, input);
    if (!emulsion) {
      throw new DomainError('NOT_FOUND', 'Emulsion not found', { label: 'errors.emulsions.notFound' });
    }
    await this.referenceService.upsertReferenceValues(userId, [
      { kind: 'manufacturer', value: input.manufacturer },
      { kind: 'brand', value: input.brand }
    ]);
    return emulsion;
  }

  async delete(id: number): Promise<void> {
    const existing = await this.emulsionRepository.findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Emulsion not found', { label: 'errors.emulsions.notFound' });
    }

    const inUse = await this.emulsionRepository.isInUse(id);
    if (inUse) {
      throw new DomainError('CONFLICT', 'Emulsion cannot be deleted because it is in use by existing films', { label: 'errors.emulsions.inUse' });
    }

    await this.emulsionRepository.delete(id);
  }
}
