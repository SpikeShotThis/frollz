import { Inject, Injectable } from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import type { CreateFilmLabRequest, FilmLab, ListFilmLabsQuery, UpdateFilmLabRequest } from '@frollz2/schema';
import { DomainError } from '../../domain/errors.js';
import { FilmLabRepository } from '../../infrastructure/repositories/film-lab.repository.js';

@Injectable()
export class FilmLabsService {
  constructor(@Inject(FilmLabRepository) private readonly filmLabRepository: FilmLabRepository) {}

  list(userId: number, query: ListFilmLabsQuery): Promise<FilmLab[]> {
    return this.filmLabRepository.list(userId, query);
  }

  async getById(userId: number, filmLabId: number): Promise<FilmLab> {
    const lab = await this.filmLabRepository.findById(userId, filmLabId);
    if (!lab) {
      throw new DomainError('NOT_FOUND', 'Film lab not found');
    }
    return lab;
  }

  async create(userId: number, input: CreateFilmLabRequest): Promise<FilmLab> {
    try {
      return await this.filmLabRepository.create(userId, input);
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new DomainError('CONFLICT', 'A film lab with that name already exists');
      }
      throw error;
    }
  }

  async update(userId: number, filmLabId: number, input: UpdateFilmLabRequest): Promise<FilmLab> {
    try {
      const updated = await this.filmLabRepository.update(userId, filmLabId, input);
      if (!updated) {
        throw new DomainError('NOT_FOUND', 'Film lab not found');
      }
      return updated;
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new DomainError('CONFLICT', 'A film lab with that name already exists');
      }
      throw error;
    }
  }
}
