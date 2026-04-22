import type { CreateFilmReceiverRequest, FilmReceiver, FilmHolderSlot, UpdateFilmReceiverRequest } from '@frollz2/schema';

export abstract class ReceiverRepository {
  abstract list(userId: number): Promise<FilmReceiver[]>;

  abstract findById(userId: number, receiverId: number): Promise<FilmReceiver | null>;

  abstract create(userId: number, input: CreateFilmReceiverRequest): Promise<FilmReceiver>;

  abstract update(userId: number, receiverId: number, input: UpdateFilmReceiverRequest): Promise<FilmReceiver | null>;

  abstract delete(userId: number, receiverId: number): Promise<void>;

  abstract listHolderSlots(userId: number, filmReceiverId: number): Promise<FilmHolderSlot[]>;

  abstract findActiveHolderSlot(
    userId: number,
    filmReceiverId: number,
    sideNumber: number
  ): Promise<FilmHolderSlot | null>;
}
