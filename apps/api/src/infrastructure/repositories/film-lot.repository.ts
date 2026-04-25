import type { FilmLotDetail, FilmLotSummary } from '@frollz2/schema';

export abstract class FilmLotRepository {
  abstract list(userId: number): Promise<FilmLotSummary[]>;
  abstract findById(userId: number, lotId: number): Promise<FilmLotDetail | null>;
}
