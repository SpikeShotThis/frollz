import type { FilmSupplier } from '@frollz2/schema';
import { filmSupplierSchema } from '@frollz2/schema';
import type { FilmSupplierEntity } from '../entities/index.js';

export function mapFilmSupplierEntity(entity: FilmSupplierEntity): FilmSupplier {
  return filmSupplierSchema.parse({
    id: entity.id,
    userId: entity.user.id,
    name: entity.name,
    normalizedName: entity.normalizedName,
    contact: entity.contact,
    email: entity.email,
    website: entity.website,
    notes: entity.notes,
    active: entity.active,
    rating: entity.rating
  });
}
