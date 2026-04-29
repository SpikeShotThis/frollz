import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  CreateDeviceMountRequest,
  CreateFilmDeviceRequest,
  DeviceLoadTimelineEvent,
  DeviceMount,
  FilmDevice,
  FilmHolderSlot,
  UnmountDeviceRequest,
  UpdateFilmDeviceRequest
} from '@frollz2/schema';
import { isFrameSizeValidForFormatCode } from '@frollz2/schema';
import { DomainError } from '../../domain/errors.js';
import { FilmFormatEntity } from '../../infrastructure/entities/index.js';
import { FilmRepository } from '../../infrastructure/repositories/film.repository.js';
import { DeviceRepository } from '../../infrastructure/repositories/device.repository.js';

@Injectable()
export class DevicesService {
  constructor(
    @Inject(DeviceRepository) private readonly deviceRepository: DeviceRepository,
    @Inject(FilmRepository) private readonly filmRepository: FilmRepository,
    @Inject(EntityManager) private readonly entityManager: EntityManager
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

  async create(userId: number, input: CreateFilmDeviceRequest): Promise<FilmDevice> {
    await this.assertFrameSizeMatchesFormat(input.filmFormatId, input.frameSize);
    return this.deviceRepository.create(userId, input);
  }

  async update(userId: number, deviceId: number, input: UpdateFilmDeviceRequest): Promise<FilmDevice> {
    if (input.frameSize !== undefined || input.filmFormatId !== undefined) {
      const current = await this.deviceRepository.findById(userId, deviceId);
      if (!current) {
        throw new DomainError('NOT_FOUND', 'Device not found');
      }
      await this.assertFrameSizeMatchesFormat(input.filmFormatId ?? current.filmFormatId, input.frameSize ?? current.frameSize);
    }

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

  async listLoadEvents(userId: number, deviceId: number): Promise<DeviceLoadTimelineEvent[]> {
    const device = await this.deviceRepository.findById(userId, deviceId);

    if (!device) {
      throw new DomainError('NOT_FOUND', 'Device not found');
    }

    return this.filmRepository.listDeviceLoadEvents(userId, deviceId);
  }

  async listMounts(userId: number, cameraDeviceId: number): Promise<DeviceMount[]> {
    const camera = await this.deviceRepository.findById(userId, cameraDeviceId);
    if (!camera || camera.deviceTypeCode !== 'camera') {
      throw new DomainError('NOT_FOUND', 'Camera not found');
    }

    return this.deviceRepository.listMountsForCamera(userId, cameraDeviceId);
  }

  async mount(userId: number, cameraDeviceId: number, input: CreateDeviceMountRequest): Promise<DeviceMount> {
    const camera = await this.deviceRepository.findById(userId, cameraDeviceId);
    if (!camera || camera.deviceTypeCode !== 'camera') {
      throw new DomainError('NOT_FOUND', 'Camera not found');
    }

    const mounted = await this.deviceRepository.findById(userId, input.mountedDeviceId);
    if (!mounted) {
      throw new DomainError('NOT_FOUND', 'Mounted device not found');
    }
    if (mounted.deviceTypeCode === 'camera') {
      throw new DomainError('DOMAIN_ERROR', 'Only interchangeable backs or film holders can be mounted');
    }

    if (camera.loadMode === 'direct') {
      throw new DomainError('DOMAIN_ERROR', 'This camera does not support mounted devices');
    }

    if (camera.loadMode === 'interchangeable_back') {
      if (mounted.deviceTypeCode !== 'interchangeable_back') {
        throw new DomainError('DOMAIN_ERROR', 'This camera can only mount interchangeable backs');
      }
      if (!camera.cameraSystem) {
        throw new DomainError('DOMAIN_ERROR', 'This camera requires a system to mount interchangeable backs');
      }
      if (mounted.system !== camera.cameraSystem) {
        throw new DomainError('DOMAIN_ERROR', 'Interchangeable back system is not compatible with this camera');
      }
    }

    if (camera.loadMode === 'film_holder' && mounted.deviceTypeCode !== 'film_holder') {
      throw new DomainError('DOMAIN_ERROR', 'This camera can only mount film holders');
    }

    const activeMountForCamera = await this.deviceRepository.findActiveMountForCamera(userId, cameraDeviceId);
    if (activeMountForCamera) {
      throw new DomainError('CONFLICT', 'Camera already has an active mounted device');
    }

    const activeMountForMounted = await this.deviceRepository.findActiveMountForMountedDevice(userId, input.mountedDeviceId);
    if (activeMountForMounted) {
      throw new DomainError('CONFLICT', 'This device is already mounted to another camera');
    }

    return this.deviceRepository.createMount(userId, cameraDeviceId, input);
  }

  async unmount(userId: number, cameraDeviceId: number, input: UnmountDeviceRequest): Promise<DeviceMount> {
    const camera = await this.deviceRepository.findById(userId, cameraDeviceId);
    if (!camera || camera.deviceTypeCode !== 'camera') {
      throw new DomainError('NOT_FOUND', 'Camera not found');
    }

    const unmounted = await this.deviceRepository.unmount(userId, cameraDeviceId, input);
    if (!unmounted) {
      throw new DomainError('NOT_FOUND', 'Active mount not found');
    }

    return unmounted;
  }

  private async assertFrameSizeMatchesFormat(filmFormatId: number, frameSize: string): Promise<void> {
    const format = await this.entityManager.findOne(FilmFormatEntity, { id: filmFormatId });
    if (!format) {
      throw new DomainError('NOT_FOUND', 'Film format not found');
    }

    if (!isFrameSizeValidForFormatCode(format.code, frameSize)) {
      throw new DomainError('DOMAIN_ERROR', `Frame size ${frameSize} is not valid for ${format.code}`);
    }
  }
}
