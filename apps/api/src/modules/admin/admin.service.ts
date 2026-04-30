import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { ExportData } from '@frollz2/schema';
import { nowIso } from '../../common/utils/time.js';
import {
  UserEntity,
  FilmDeviceEntity,
  FilmLotEntity,
  FilmEntity,
  FilmJourneyEventEntity,
  FilmFrameEntity,
  FrameJourneyEventEntity,
  DeviceMountEntity,
  DeviceTypeEntity,
  FilmFormatEntity,
  EmulsionEntity,
  PackageTypeEntity,
  FilmStateEntity,
  CameraEntity,
  InterchangeableBackEntity,
  FilmHolderEntity,
  FilmHolderSlotEntity,
  HolderTypeEntity,
  SlotStateEntity
  ,
  FilmLabEntity
  ,
  FilmSupplierEntity
} from '../../infrastructure/entities/index.js';
import {
  mapCurrentUserEntity,
  mapFilmDeviceEntity,
  mapFilmLotSummaryEntity,
  mapFilmSummaryEntity,
  mapFilmJourneyEventEntity,
  mapFilmFrameEntity,
  mapFrameJourneyEventEntity,
  mapDeviceMountEntity
  ,
  mapFilmLabEntity
  ,
  mapFilmSupplierEntity
} from '../../infrastructure/mappers/index.js';

@Injectable()
export class AdminService {
  constructor(
    @Inject(EntityManager) private readonly entityManager: EntityManager
  ) { }

  async exportUserData(userId: number): Promise<ExportData> {
    // Load user with all related data
    const user = await this.entityManager.findOneOrFail(UserEntity, { id: userId });

    // Load all user devices with their related data
    const filmLabs = await this.entityManager.find(FilmLabEntity, { user: userId }, { populate: ['user'], orderBy: { name: 'asc' } });
    const filmSuppliers = await this.entityManager.find(FilmSupplierEntity, { user: userId }, { populate: ['user'], orderBy: { name: 'asc' } });

    // Load all user devices with their related data
    const devices = await this.entityManager.find(
      FilmDeviceEntity,
      { user: userId },
      {
        populate: [
          'deviceType',
          'filmFormat',
          'camera',
          'interchangeableBack',
          'filmHolder',
          'filmHolder.holderType',
          'filmHolder.slots',
          'filmHolder.slots.slotState'
        ]
      }
    );

    // Load all film lots with their related data
    const filmLots = await this.entityManager.find(
      FilmLotEntity,
      { user: userId },
      {
        populate: [
          'emulsion',
          'emulsion.developmentProcess',
          'emulsion.filmFormats',
          'packageType',
          'packageType.filmFormat',
          'filmFormat'
          ,
          'supplier'
        ]
      }
    );

    // Get film counts for each lot
    const filmCounts = new Map<number, number>();
    for (const lot of filmLots) {
      const count = await this.entityManager.count(FilmEntity, { filmLot: lot.id });
      filmCounts.set(lot.id, count);
    }

    // Load all films with their related data
    const films = await this.entityManager.find(
      FilmEntity,
      { user: userId },
      {
        populate: [
          'filmLot',
          'emulsion',
          'emulsion.developmentProcess',
          'emulsion.filmFormats',
          'packageType',
          'packageType.filmFormat',
          'filmFormat',
          'currentState'
        ]
      }
    );

    // Load all film journey events
    const filmEvents = await this.entityManager.find(
      FilmJourneyEventEntity,
      { user: userId },
      {
        populate: ['film', 'filmState'],
        orderBy: { recordedAt: 'ASC' }
      }
    );

    // Load all frames
    const frames = await this.entityManager.find(
      FilmFrameEntity,
      { user: userId },
      {
        populate: ['film', 'currentState']
      }
    );

    // Load all frame journey events
    const frameEvents = await this.entityManager.find(
      FrameJourneyEventEntity,
      { user: userId },
      {
        populate: ['film', 'filmFrame', 'filmState'],
        orderBy: { recordedAt: 'ASC' }
      }
    );

    // Load all device mounts
    const deviceMounts = await this.entityManager.find(
      DeviceMountEntity,
      { user: userId },
      {
        populate: ['cameraDevice', 'mountedDevice']
      }
    );

    // Map entities to DTOs
    const currentUser = mapCurrentUserEntity(user);
    const exportData: ExportData = {
      version: '1.0',
      exportedAt: nowIso(),
      user: {
        email: currentUser.email,
        name: currentUser.name
      },
      filmLabs: filmLabs.map(mapFilmLabEntity),
      filmSuppliers: filmSuppliers.map(mapFilmSupplierEntity),
      devices: devices.map(mapFilmDeviceEntity),
      filmLots: filmLots.map(lot => mapFilmLotSummaryEntity(lot, filmCounts.get(lot.id) ?? 0)),
      films: films.map((film) => mapFilmSummaryEntity(film)),
      filmEvents: filmEvents.map(mapFilmJourneyEventEntity),
      frames: frames.map(mapFilmFrameEntity),
      frameEvents: frameEvents.map(mapFrameJourneyEventEntity),
      deviceMounts: deviceMounts.map(mapDeviceMountEntity)
    };

    return exportData;
  }

  async importUserData(userId: number, data: ExportData): Promise<void> {
    await this.entityManager.transactional(async (em) => {
      // Step 1: Validate all referenced entities exist
      const filmFormats = await em.findAll(FilmFormatEntity);
      const filmFormatMap = new Map(filmFormats.map(f => [f.id, f]));

      for (const device of data.devices) {
        if (!filmFormatMap.has(device.filmFormatId)) {
          throw new Error(`Film format ${device.filmFormatId} not found`);
        }
      }

      for (const lot of data.filmLots) {
        if (!filmFormatMap.has(lot.filmFormatId)) {
          throw new Error(`Film format ${lot.filmFormatId} not found`);
        }
      }

      const lotIdMap = new Map<number, number>();
      const filmIdMap = new Map<number, number>();
      const frameIdMap = new Map<number, number>();
      const deviceIdMap = new Map<number, number>();
      const filmLabIdMap = new Map<number, number>();
      const filmSupplierIdMap = new Map<number, number>();

      // Step 2: Create film labs
      for (const importedFilmLab of data.filmLabs) {
        const filmLab = em.create(FilmLabEntity, {
          user: em.getReference(UserEntity, userId),
          name: importedFilmLab.name,
          normalizedName: importedFilmLab.normalizedName,
          contact: importedFilmLab.contact,
          email: importedFilmLab.email,
          website: importedFilmLab.website,
          defaultProcesses: importedFilmLab.defaultProcesses,
          notes: importedFilmLab.notes,
          active: importedFilmLab.active,
          rating: importedFilmLab.rating
        });
        em.persist(filmLab);
        await em.flush();
        filmLabIdMap.set(importedFilmLab.id, filmLab.id);
      }

      for (const importedFilmSupplier of data.filmSuppliers ?? []) {
        const filmSupplier = em.create(FilmSupplierEntity, {
          user: em.getReference(UserEntity, userId),
          name: importedFilmSupplier.name,
          normalizedName: importedFilmSupplier.normalizedName,
          contact: importedFilmSupplier.contact,
          email: importedFilmSupplier.email,
          website: importedFilmSupplier.website,
          notes: importedFilmSupplier.notes,
          active: importedFilmSupplier.active,
          rating: importedFilmSupplier.rating
        });
        em.persist(filmSupplier);
        await em.flush();
        filmSupplierIdMap.set(importedFilmSupplier.id, filmSupplier.id);
      }

      // Step 3: Create film lots
      for (const importedLot of data.filmLots) {
        const lot = em.create(FilmLotEntity, {
          user: em.getReference(UserEntity, userId),
          emulsion: em.getReference(EmulsionEntity, importedLot.emulsionId),
          packageType: em.getReference(PackageTypeEntity, importedLot.packageTypeId),
          filmFormat: em.getReference(FilmFormatEntity, importedLot.filmFormatId),
          quantity: importedLot.quantity,
          expirationDate: importedLot.expirationDate ?? null,
          supplier: importedLot.purchaseInfo?.supplierId
            ? em.getReference(FilmSupplierEntity, filmSupplierIdMap.get(importedLot.purchaseInfo.supplierId) ?? importedLot.purchaseInfo.supplierId)
            : null,
          purchaseInfo: importedLot.purchaseInfo
            ? {
              channel: importedLot.purchaseInfo.channel ?? null,
              price: importedLot.purchaseInfo.price ?? null,
              currencyCode: importedLot.purchaseInfo.currencyCode ?? null,
              orderRef: importedLot.purchaseInfo.orderRef ?? null,
              obtainedDate: importedLot.purchaseInfo.obtainedDate ?? nowIso()
            }
            : null,
          rating: importedLot.rating ?? null,
          createdAt: nowIso()
        });
        em.persist(lot);
        await em.flush();
        lotIdMap.set(importedLot.id, lot.id);
      }

      // Step 4: Create films
      for (const importedFilm of data.films) {
        const newLotId = lotIdMap.get(importedFilm.filmLotId);
        if (!newLotId) {
          throw new Error(`Film lot ${importedFilm.filmLotId} not found in mappings`);
        }

        const purchasedState = await em.findOneOrFail(FilmStateEntity, { code: 'purchased' });
        const film = em.create(FilmEntity, {
          user: em.getReference(UserEntity, userId),
          filmLot: em.getReference(FilmLotEntity, newLotId),
          emulsion: em.getReference(EmulsionEntity, importedFilm.emulsionId),
          packageType: em.getReference(PackageTypeEntity, importedFilm.packageTypeId),
          filmFormat: em.getReference(FilmFormatEntity, importedFilm.filmFormatId),
          name: importedFilm.name,
          currentState: purchasedState
        });
        em.persist(film);
        await em.flush();
        filmIdMap.set(importedFilm.id, film.id);
      }

      // Step 5: Create film journey events
      for (const importedEvent of data.filmEvents) {
        const newFilmId = filmIdMap.get(importedEvent.filmId);
        if (!newFilmId) {
          throw new Error(`Film ${importedEvent.filmId} not found in mappings`);
        }

        const filmState = await em.findOneOrFail(FilmStateEntity, { code: importedEvent.filmStateCode });
        const eventData = { ...importedEvent.eventData };
        if (typeof eventData['labId'] === 'number') {
          const newFilmLabId = filmLabIdMap.get(eventData['labId']);
          if (newFilmLabId) {
            eventData['labId'] = newFilmLabId;
          }
        }
        const event = em.create(FilmJourneyEventEntity, {
          film: em.getReference(FilmEntity, newFilmId),
          user: em.getReference(UserEntity, userId),
          filmState,
          occurredAt: importedEvent.occurredAt,
          recordedAt: importedEvent.recordedAt,
          notes: importedEvent.notes ?? null,
          eventData
        });
        em.persist(event);
      }
      await em.flush();

      // Step 6: Create frames
      for (const importedFrame of data.frames) {
        const newFilmId = filmIdMap.get(importedFrame.filmId);
        if (!newFilmId) {
          throw new Error(`Film ${importedFrame.filmId} not found in mappings`);
        }

        const frameState = await em.findOneOrFail(FilmStateEntity, { code: importedFrame.currentStateCode });
        const frame = em.create(FilmFrameEntity, {
          film: em.getReference(FilmEntity, newFilmId),
          user: em.getReference(UserEntity, userId),
          frameNumber: importedFrame.frameNumber,
          currentState: frameState
        });
        em.persist(frame);
        await em.flush();
        frameIdMap.set(importedFrame.id, frame.id);
      }

      // Step 7: Create frame journey events
      for (const importedFrameEvent of data.frameEvents) {
        const newFilmId = filmIdMap.get(importedFrameEvent.filmId);
        const newFrameId = frameIdMap.get(importedFrameEvent.filmFrameId);
        if (!newFilmId) {
          throw new Error(`Film ${importedFrameEvent.filmId} not found in mappings`);
        }
        if (!newFrameId) {
          throw new Error(`Frame ${importedFrameEvent.filmFrameId} not found in mappings`);
        }

        const frameState = await em.findOneOrFail(FilmStateEntity, { code: importedFrameEvent.frameStateCode });
        const frameEvent = em.create(FrameJourneyEventEntity, {
          film: em.getReference(FilmEntity, newFilmId),
          filmFrame: em.getReference(FilmFrameEntity, newFrameId),
          user: em.getReference(UserEntity, userId),
          filmState: frameState,
          occurredAt: importedFrameEvent.occurredAt,
          recordedAt: importedFrameEvent.recordedAt,
          notes: importedFrameEvent.notes ?? null,
          eventData: importedFrameEvent.eventData
        });
        em.persist(frameEvent);
      }
      await em.flush();

      // Step 8: Create devices
      for (const importedDevice of data.devices) {
        const base = em.create(FilmDeviceEntity, {
          user: em.getReference(UserEntity, userId),
          deviceType: em.getReference(DeviceTypeEntity, importedDevice.deviceTypeId),
          filmFormat: em.getReference(FilmFormatEntity, importedDevice.filmFormatId),
          frameSize: importedDevice.frameSize
        });
        em.persist(base);
        await em.flush();

        if (importedDevice.deviceTypeCode === 'camera') {
          const camera = em.create(CameraEntity, {
            filmDevice: base,
            make: importedDevice.make,
            model: importedDevice.model,
            loadMode: importedDevice.loadMode,
            canUnload: importedDevice.canUnload,
            cameraSystem: importedDevice.cameraSystem ?? null,
            serialNumber: importedDevice.serialNumber ?? null,
            dateAcquired: importedDevice.dateAcquired ?? null
          });
          em.persist(camera);
          await em.flush();
        }

        if (importedDevice.deviceTypeCode === 'interchangeable_back') {
          const back = em.create(InterchangeableBackEntity, {
            filmDevice: base,
            name: importedDevice.name,
            system: importedDevice.system
          });
          em.persist(back);
          await em.flush();
        }

        if (importedDevice.deviceTypeCode === 'film_holder') {
          const filmHolder = em.create(FilmHolderEntity, {
            filmDevice: base,
            name: importedDevice.name,
            brand: importedDevice.brand,
            slotCount: importedDevice.slotCount as 1 | 2,
            holderType: em.getReference(HolderTypeEntity, importedDevice.holderTypeId)
          });
          em.persist(filmHolder);
          await em.flush();

          if (importedDevice.slots) {
            for (const importedSlot of importedDevice.slots) {
              let mappedLoadedFilmId: number | null = null;
              if (importedSlot.loadedFilmId) {
                const newFilmId = filmIdMap.get(importedSlot.loadedFilmId);
                if (!newFilmId) {
                  throw new Error(`Film ${importedSlot.loadedFilmId} in slot not found in mappings`);
                }
                mappedLoadedFilmId = newFilmId;
              }

              const slot = em.create(FilmHolderSlotEntity, {
                user: em.getReference(UserEntity, userId),
                filmHolder,
                sideNumber: importedSlot.sideNumber,
                slotState: em.getReference(SlotStateEntity, importedSlot.slotStateId),
                slotStateCode: importedSlot.slotStateCode,
                loadedFilm: mappedLoadedFilmId ? em.getReference(FilmEntity, mappedLoadedFilmId) : null,
                createdAt: importedSlot.createdAt
              });
              em.persist(slot);
            }
            await em.flush();
          }
        }

        deviceIdMap.set(importedDevice.id, base.id);
      }

      // Step 8: Create device mounts
      for (const importedMount of data.deviceMounts) {
        const cameraDeviceId = deviceIdMap.get(importedMount.cameraDeviceId);
        const mountedDeviceId = deviceIdMap.get(importedMount.mountedDeviceId);

        if (!cameraDeviceId) {
          throw new Error(`Camera device ${importedMount.cameraDeviceId} not found in mappings`);
        }
        if (!mountedDeviceId) {
          throw new Error(`Mounted device ${importedMount.mountedDeviceId} not found in mappings`);
        }

        const mount = em.create(DeviceMountEntity, {
          cameraDevice: em.getReference(FilmDeviceEntity, cameraDeviceId),
          mountedDevice: em.getReference(FilmDeviceEntity, mountedDeviceId),
          user: em.getReference(UserEntity, userId),
          mountedAt: importedMount.mountedAt,
          unmountedAt: null
        });
        em.persist(mount);
      }
      await em.flush();
    });
  }
}
