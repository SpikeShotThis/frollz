import { Inject, Injectable } from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import type { CreateFilmLabRequest, FilmLab, ListFilmLabsQuery, UpdateFilmLabRequest } from '@frollz2/schema';
import { DomainError } from '../../domain/errors.js';
import { FilmLabRepository } from '../../infrastructure/repositories/film-lab.repository.js';
import { ReferenceService } from '../reference/reference.service.js';

@Injectable()
export class FilmLabsService {
  constructor(
    @Inject(FilmLabRepository) private readonly filmLabRepository: FilmLabRepository,
    @Inject(ReferenceService) private readonly referenceService: ReferenceService
  ) {}

  list(userId: number, query: ListFilmLabsQuery): Promise<FilmLab[]> {
    return this.filmLabRepository.list(userId, query);
  }

  async getById(userId: number, filmLabId: number): Promise<FilmLab> {
    const lab = await this.filmLabRepository.findById(userId, filmLabId);
    if (!lab) {
      throw new DomainError('NOT_FOUND', 'Film lab not found', { label: 'errors.filmLabs.notFound' });
    }
    return lab;
  }

  async create(userId: number, input: CreateFilmLabRequest): Promise<FilmLab> {
    try {
      const lab = await this.filmLabRepository.create(userId, input);
      await this.upsertReferenceValues(userId, lab);
      return lab;
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new DomainError('CONFLICT', 'A film lab with that name already exists', { label: 'errors.filmLabs.nameConflict' });
      }
      throw error;
    }
  }

  async update(userId: number, filmLabId: number, input: UpdateFilmLabRequest): Promise<FilmLab> {
    try {
      const updated = await this.filmLabRepository.update(userId, filmLabId, input);
      if (!updated) {
        throw new DomainError('NOT_FOUND', 'Film lab not found', { label: 'errors.filmLabs.notFound' });
      }
      await this.upsertReferenceValues(userId, updated);
      return updated;
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new DomainError('CONFLICT', 'A film lab with that name already exists', { label: 'errors.filmLabs.nameConflict' });
      }
      throw error;
    }
  }

  private async upsertReferenceValues(userId: number, lab: FilmLab): Promise<void> {
    const items = [
      { kind: 'lab_name' as const, value: lab.name },
      ...(lab.contact ? [{ kind: 'lab_contact' as const, value: lab.contact }] : [])
    ];

    if (items.length > 0) {
      await this.referenceService.upsertReferenceValues(userId, items);
    }
  }
}
