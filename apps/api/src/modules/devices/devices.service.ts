import { Inject, Injectable } from '@nestjs/common';
import type { CreateFilmDeviceRequest, FilmHolderSlot, FilmDevice, UpdateFilmDeviceRequest } from '@frollz2/schema';
import { DomainError } from '../../domain/errors.js';
import { FilmRepository } from '../../infrastructure/repositories/film.repository.js';
import { DeviceRepository } from '../../infrastructure/repositories/device.repository.js';

@Injectable()
export class DevicesService {
  constructor(
    @Inject(DeviceRepository) private readonly deviceRepository: DeviceRepository,
    @Inject(FilmRepository) private readonly filmRepository: FilmRepository
  ) { }

  list(userId: number): Promise<FilmDevice[]> {
    return this.deviceRepository.list(userId);
  }

  async findById(userId: number, deviceId: number): Promise<FilmDevice> {
    const device = await this.deviceRepository.findById(userId, deviceId);

    if (!device) {
      throw new DomainError('NOT_FOUND', 'Device not found');
    }

    return device;
  }

  create(userId: number, input: CreateFilmDeviceRequest): Promise<FilmDevice> {
    return this.deviceRepository.create(userId, input);
  }

  async update(userId: number, deviceId: number, input: UpdateFilmDeviceRequest): Promise<FilmDevice> {
    const device = await this.deviceRepository.update(userId, deviceId, input);

    if (!device) {
      throw new DomainError('NOT_FOUND', 'Device not found');
    }

    return device;
  }

  async delete(userId: number, deviceId: number): Promise<void> {
    const device = await this.deviceRepository.findById(userId, deviceId);

    if (!device) {
      throw new DomainError('NOT_FOUND', 'Device not found');
    }

    const occupiedFilmId = await this.filmRepository.findOccupiedFilmForDeviceId(userId, device.id);
    if (occupiedFilmId !== null) {
      throw new DomainError('CONFLICT', 'Device still has an active loaded film');
    }

    await this.deviceRepository.delete(userId, deviceId);
  }

  listHolderSlots(userId: number, filmDeviceId: number): Promise<FilmHolderSlot[]> {
    return this.deviceRepository.listHolderSlots(userId, filmDeviceId);
  }
}