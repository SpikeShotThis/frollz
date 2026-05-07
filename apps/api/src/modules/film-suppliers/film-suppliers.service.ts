import { Inject, Injectable } from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import type { CreateFilmSupplierRequest, FilmSupplier, ListFilmSuppliersQuery, UpdateFilmSupplierRequest } from '@frollz2/schema';
import { DomainError } from '../../domain/errors.js';
import { FilmSupplierRepository } from '../../infrastructure/repositories/film-supplier.repository.js';

@Injectable()
export class FilmSuppliersService {
  constructor(@Inject(FilmSupplierRepository) private readonly filmSupplierRepository: FilmSupplierRepository) {}

  list(userId: number, query: ListFilmSuppliersQuery): Promise<FilmSupplier[]> {
    return this.filmSupplierRepository.list(userId, query);
  }

  async getById(userId: number, supplierId: number): Promise<FilmSupplier> {
    const supplier = await this.filmSupplierRepository.findById(userId, supplierId);
    if (!supplier) {
      throw new DomainError('NOT_FOUND', 'Film supplier not found', { label: 'errors.filmSuppliers.notFound' });
    }
    return supplier;
  }

  async create(userId: number, input: CreateFilmSupplierRequest): Promise<FilmSupplier> {
    try {
      return await this.filmSupplierRepository.create(userId, input);
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new DomainError('CONFLICT', 'A film supplier with that name already exists', { label: 'errors.filmSuppliers.nameConflict' });
      }
      throw error;
    }
  }

  async update(userId: number, supplierId: number, input: UpdateFilmSupplierRequest): Promise<FilmSupplier> {
    try {
      const updated = await this.filmSupplierRepository.update(userId, supplierId, input);
      if (!updated) {
        throw new DomainError('NOT_FOUND', 'Film supplier not found', { label: 'errors.filmSuppliers.notFound' });
      }
      return updated;
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new DomainError('CONFLICT', 'A film supplier with that name already exists', { label: 'errors.filmSuppliers.nameConflict' });
      }
      throw error;
    }
  }
}
