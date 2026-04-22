import { Inject, Injectable } from '@nestjs/common';
import type { CreateFilmReceiverRequest, FilmHolderSlot, FilmReceiver, UpdateFilmReceiverRequest } from '@frollz2/schema';
import { DomainError } from '../../domain/errors.js';
import { FilmRepository } from '../../infrastructure/repositories/film.repository.js';
import { ReceiverRepository } from '../../infrastructure/repositories/receiver.repository.js';

@Injectable()
export class ReceiversService {
  constructor(
    @Inject(ReceiverRepository) private readonly receiverRepository: ReceiverRepository,
    @Inject(FilmRepository) private readonly filmRepository: FilmRepository
  ) { }

  list(userId: number): Promise<FilmReceiver[]> {
    return this.receiverRepository.list(userId);
  }

  async findById(userId: number, receiverId: number): Promise<FilmReceiver> {
    const receiver = await this.receiverRepository.findById(userId, receiverId);

    if (!receiver) {
      throw new DomainError('NOT_FOUND', 'Receiver not found');
    }

    return receiver;
  }

  create(userId: number, input: CreateFilmReceiverRequest): Promise<FilmReceiver> {
    return this.receiverRepository.create(userId, input);
  }

  async update(userId: number, receiverId: number, input: UpdateFilmReceiverRequest): Promise<FilmReceiver> {
    const receiver = await this.receiverRepository.update(userId, receiverId, input);

    if (!receiver) {
      throw new DomainError('NOT_FOUND', 'Receiver not found');
    }

    return receiver;
  }

  async delete(userId: number, receiverId: number): Promise<void> {
    const receiver = await this.receiverRepository.findById(userId, receiverId);

    if (!receiver) {
      throw new DomainError('NOT_FOUND', 'Receiver not found');
    }

    const occupiedFilmId = await this.filmRepository.findOccupiedFilmForReceiverId(userId, receiver.id);
    if (occupiedFilmId !== null) {
      throw new DomainError('CONFLICT', 'Receiver still has an active loaded film');
    }

    await this.receiverRepository.delete(userId, receiverId);
  }

  listHolderSlots(userId: number, filmReceiverId: number): Promise<FilmHolderSlot[]> {
    return this.receiverRepository.listHolderSlots(userId, filmReceiverId);
  }
}