import type { CreateFilmSupplierRequest, FilmSupplier, FilmSupplierActivity, ListFilmSuppliersQuery, UpdateFilmSupplierRequest } from '@frollz2/schema';

export abstract class FilmSupplierRepository {
  abstract list(userId: number, query: ListFilmSuppliersQuery): Promise<FilmSupplier[]>;
  abstract findById(userId: number, supplierId: number): Promise<FilmSupplier | null>;
  abstract activity(userId: number, supplierId: number): Promise<FilmSupplierActivity | null>;
  abstract findByName(userId: number, name: string): Promise<FilmSupplier | null>;
  abstract create(userId: number, input: CreateFilmSupplierRequest): Promise<FilmSupplier>;
  abstract update(userId: number, supplierId: number, input: UpdateFilmSupplierRequest): Promise<FilmSupplier | null>;
}
