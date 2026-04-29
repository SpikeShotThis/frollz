import type { CreateFilmSupplierRequest, FilmSupplier, ListFilmSuppliersQuery, UpdateFilmSupplierRequest } from '@frollz2/schema';

export abstract class FilmSupplierRepository {
  abstract list(userId: number, query: ListFilmSuppliersQuery): Promise<FilmSupplier[]>;
  abstract findById(userId: number, supplierId: number): Promise<FilmSupplier | null>;
  abstract findByName(userId: number, name: string): Promise<FilmSupplier | null>;
  abstract create(userId: number, input: CreateFilmSupplierRequest): Promise<FilmSupplier>;
  abstract update(userId: number, supplierId: number, input: UpdateFilmSupplierRequest): Promise<FilmSupplier | null>;
}
