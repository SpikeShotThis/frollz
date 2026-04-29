import type { FilmLab } from '@frollz2/schema';
import { filmLabSchema } from '@frollz2/schema';
import type { FilmLabEntity } from '../entities/index.js';

export function mapFilmLabEntity(entity: FilmLabEntity): FilmLab {
  return filmLabSchema.parse({
    id: entity.id,
    userId: entity.user.id,
    name: entity.name,
    normalizedName: entity.normalizedName,
    contact: entity.contact,
    email: entity.email,
    website: entity.website,
    defaultProcesses: entity.defaultProcesses,
    notes: entity.notes,
    active: entity.active,
    rating: entity.rating
  });
}
