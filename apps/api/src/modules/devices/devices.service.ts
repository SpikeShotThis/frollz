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
import { ReferenceService } from '../reference/reference.service.js';

type DeviceReferenceInput = Partial<Record<'make' | 'model' | 'brand' | 'system' | 'cameraSystem', unknown>>;

@Injectable()
export class DevicesService {
  constructor(
    @Inject(DeviceRepository) private readonly deviceRepository: DeviceRepository,
    @Inject(FilmRepository) private readonly filmRepository: FilmRepository,
    @Inject(EntityManager) private readonly entityManager: EntityManager,
    @Inject(ReferenceService) private readonly referenceService: ReferenceService
  ) { }

  list(userId: number): Promise<FilmDevice[]> {
    return this.deviceRepository.list(userId);
  }

  async findById(userId: number, deviceId: number): Promise<FilmDevice> {
    const device = await this.deviceRepository.findById(userId, deviceId);

    if (!device) {
      throw new DomainError('NOT_FOUND', 'Device not found', { label: 'errors.devices.notFound' });
    }

    return device;
  }

  async create(userId: number, input: CreateFilmDeviceRequest): Promise<FilmDevice> {

    if (this.requiresFrameSize(input.deviceTypeCode, this.readLoadMode(input))) {
      if (input.frameSize == null) {
        throw new DomainError('DOMAIN_ERROR', 'Directly loadable cameras require a frame size', { label: 'errors.devices.directLoadRequiresFrameSize' });
      }
      await this.assertFrameSizeMatchesFormat(input.filmFormatId, input.frameSize);
    }
    await this.assertNoDuplicateDevice(userId, input);
    const device = await this.deviceRepository.create(userId, input);
    await this.upsertReferenceValues(userId, input);
    return device;
  }

  async update(userId: number, deviceId: number, input: UpdateFilmDeviceRequest): Promise<FilmDevice> {
    if (input.frameSize !== undefined || input.filmFormatId !== undefined) {
      const current = await this.deviceRepository.findById(userId, deviceId);
      if (!current) {
        throw new DomainError('NOT_FOUND', 'Device not found', { label: 'errors.devices.notFound' });
      }
      const requestedLoadMode = 'loadMode' in input ? input.loadMode : undefined;
      const effectiveLoadMode = requestedLoadMode ?? this.readLoadMode(current);
      if (this.requiresFrameSize(current.deviceTypeCode, effectiveLoadMode)) {
        const effectiveFrameSize = input.frameSize !== undefined ? input.frameSize : current.frameSize;
        if (effectiveFrameSize != null) {
          await this.assertFrameSizeMatchesFormat(input.filmFormatId ?? current.filmFormatId, effectiveFrameSize);
        }
      }
    }

    const device = await this.deviceRepository.update(userId, deviceId, input);

    if (!device) {
      throw new DomainError('NOT_FOUND', 'Device not found', { label: 'errors.devices.notFound' });
    }

    await this.upsertReferenceValues(userId, input);

    return device;
  }

  async delete(userId: number, deviceId: number): Promise<void> {
    const device = await this.deviceRepository.findById(userId, deviceId);

    if (!device) {
      throw new DomainError('NOT_FOUND', 'Device not found', { label: 'errors.devices.notFound' });
    }

    const occupiedFilmId = await this.filmRepository.findOccupiedFilmForDeviceId(userId, device.id);
    if (occupiedFilmId !== null) {
      throw new DomainError('CONFLICT', 'Device still has an active loaded film', { label: 'errors.devices.hasActiveFilm' });
    }

    await this.deviceRepository.delete(userId, deviceId);
  }

  listHolderSlots(userId: number, filmDeviceId: number): Promise<FilmHolderSlot[]> {
    return this.deviceRepository.listHolderSlots(userId, filmDeviceId);
  }

  async listLoadEvents(userId: number, deviceId: number): Promise<DeviceLoadTimelineEvent[]> {
    const device = await this.deviceRepository.findById(userId, deviceId);

    if (!device) {
      throw new DomainError('NOT_FOUND', 'Device not found', { label: 'errors.devices.notFound' });
    }

    return this.filmRepository.listDeviceLoadEvents(userId, deviceId);
  }

  async listMounts(userId: number, cameraDeviceId: number): Promise<DeviceMount[]> {
    const camera = await this.deviceRepository.findById(userId, cameraDeviceId);
    if (!camera || camera.deviceTypeCode !== 'camera') {
      throw new DomainError('NOT_FOUND', 'Camera not found', { label: 'errors.devices.cameraNotFound' });
    }

    return this.deviceRepository.listMountsForCamera(userId, cameraDeviceId);
  }

  async mount(userId: number, cameraDeviceId: number, input: CreateDeviceMountRequest): Promise<DeviceMount> {
    const camera = await this.deviceRepository.findById(userId, cameraDeviceId);
    if (!camera || camera.deviceTypeCode !== 'camera') {
      throw new DomainError('NOT_FOUND', 'Camera not found', { label: 'errors.devices.cameraNotFound' });
    }

    const mounted = await this.deviceRepository.findById(userId, input.mountedDeviceId);
    if (!mounted) {
      throw new DomainError('NOT_FOUND', 'Mounted device not found', { label: 'errors.devices.mountedDeviceNotFound' });
    }
    if (mounted.deviceTypeCode === 'camera') {
      throw new DomainError('DOMAIN_ERROR', 'Only interchangeable backs or film holders can be mounted', { label: 'errors.devices.onlyBacksOrHolders' });
    }

    if (camera.loadMode === 'direct') {
      throw new DomainError('DOMAIN_ERROR', 'This camera does not support mounted devices', { label: 'errors.devices.cameraNoMounted' });
    }

    if (camera.loadMode === 'interchangeable_back') {
      if (mounted.deviceTypeCode !== 'interchangeable_back') {
        throw new DomainError('DOMAIN_ERROR', 'This camera can only mount interchangeable backs', { label: 'errors.devices.cameraOnlyBacks' });
      }
      if (!camera.cameraSystem) {
        throw new DomainError('DOMAIN_ERROR', 'This camera requires a system to mount interchangeable backs', { label: 'errors.devices.cameraRequiresSystem' });
      }
      if (mounted.system !== camera.cameraSystem) {
        throw new DomainError('DOMAIN_ERROR', 'Interchangeable back system is not compatible with this camera', { label: 'errors.devices.backSystemIncompatible' });
      }
    }

    if (camera.loadMode === 'film_holder' && mounted.deviceTypeCode !== 'film_holder') {
      throw new DomainError('DOMAIN_ERROR', 'This camera can only mount film holders', { label: 'errors.devices.cameraOnlyHolders' });
    }

    const activeMountForCamera = await this.deviceRepository.findActiveMountForCamera(userId, cameraDeviceId);
    if (activeMountForCamera) {
      throw new DomainError('CONFLICT', 'Camera already has an active mounted device', { label: 'errors.devices.cameraAlreadyMounted' });
    }

    const activeMountForMounted = await this.deviceRepository.findActiveMountForMountedDevice(userId, input.mountedDeviceId);
    if (activeMountForMounted) {
      throw new DomainError('CONFLICT', 'This device is already mounted to another camera', { label: 'errors.devices.alreadyMounted' });
    }

    return this.deviceRepository.createMount(userId, cameraDeviceId, input);
  }

  async unmount(userId: number, cameraDeviceId: number, input: UnmountDeviceRequest): Promise<DeviceMount> {
    const camera = await this.deviceRepository.findById(userId, cameraDeviceId);
    if (!camera || camera.deviceTypeCode !== 'camera') {
      throw new DomainError('NOT_FOUND', 'Camera not found', { label: 'errors.devices.cameraNotFound' });
    }

    const unmounted = await this.deviceRepository.unmount(userId, cameraDeviceId, input);
    if (!unmounted) {
      throw new DomainError('NOT_FOUND', 'Active mount not found', { label: 'errors.devices.activeMountNotFound' });
    }

    return unmounted;
  }

  private async assertFrameSizeMatchesFormat(filmFormatId: number, frameSize: string): Promise<void> {
    const format = await this.entityManager.findOne(FilmFormatEntity, { id: filmFormatId });
    if (!format) {
      throw new DomainError('NOT_FOUND', 'Film format not found', { label: 'errors.devices.formatNotFound' });
    }

    if (!isFrameSizeValidForFormatCode(format.code, frameSize)) {
      throw new DomainError('DOMAIN_ERROR', `Frame size ${frameSize} is not valid for ${format.code}`, {
        label: 'errors.devices.invalidFrameSize',
        params: { frameSize, format: format.code }
      });
    }
  }

  private requiresFrameSize(deviceTypeCode: string, loadMode: string | null | undefined): boolean {
    return deviceTypeCode !== 'camera' || loadMode === 'direct';
  }

  private readLoadMode(device: { deviceTypeCode: string } & Partial<{ loadMode: string | null }>): string | null | undefined {
    return device.deviceTypeCode === 'camera' ? device.loadMode : null;
  }

  private async upsertReferenceValues(userId: number, input: DeviceReferenceInput): Promise<void> {
    const items: Array<{ kind: 'device_make' | 'device_model' | 'brand' | 'device_system'; value: string }> = [];

    if (typeof input.make === 'string') {
      items.push({ kind: 'device_make' as const, value: input.make });
    }
    if (typeof input.model === 'string') {
      items.push({ kind: 'device_model' as const, value: input.model });
    }
    if (typeof input.brand === 'string') {
      items.push({ kind: 'brand' as const, value: input.brand });
    }
    const systemValue = typeof input.system === 'string'
      ? input.system
      : (typeof input.cameraSystem === 'string' ? input.cameraSystem : null);
    if (systemValue) {
      items.push({ kind: 'device_system' as const, value: systemValue });
    }

    if (items.length > 0) {
      await this.referenceService.upsertReferenceValues(userId, items);
    }
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  private async assertNoDuplicateDevice(userId: number, input: CreateFilmDeviceRequest): Promise<void> {
    const existing = await this.deviceRepository.list(userId);

    const hasDuplicate = existing.some((device) => {
      if (device.deviceTypeCode !== input.deviceTypeCode) return false;
      if (device.filmFormatId !== input.filmFormatId) return false;
      if ((device.frameSize ?? null) !== (input.frameSize ?? null)) return false;

      switch (device.deviceTypeCode) {
        case 'camera':
          if (input.deviceTypeCode !== 'camera') return false;
          return this.normalize(device.make) === this.normalize(input.make)
            && this.normalize(device.model) === this.normalize(input.model)
            && device.loadMode === input.loadMode;
        case 'interchangeable_back':
          if (input.deviceTypeCode !== 'interchangeable_back') return false;
          return this.normalize(device.name) === this.normalize(input.name)
            && this.normalize(device.system) === this.normalize(input.system);
        case 'film_holder':
          if (input.deviceTypeCode !== 'film_holder') return false;
          return this.normalize(device.name) === this.normalize(input.name)
            && this.normalize(device.brand) === this.normalize(input.brand)
            && device.holderTypeId === input.holderTypeId
            && device.slotCount === input.slotCount;
      }
    });

    if (hasDuplicate) {
      throw new DomainError('CONFLICT', 'A device with those details already exists', { label: 'errors.devices.duplicate' });
    }
  }
}
