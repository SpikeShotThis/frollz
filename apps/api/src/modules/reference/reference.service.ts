import { Inject, Injectable } from '@nestjs/common';
import type { ListReferenceValuesQuery, UpsertReferenceValueInput } from '@frollz2/schema';
import { ReferenceRepository } from '../../infrastructure/repositories/reference.repository.js';

@Injectable()
export class ReferenceService {
  constructor(@Inject(ReferenceRepository) private readonly referenceRepository: ReferenceRepository) { }

  getAll() {
    return this.referenceRepository.getAll();
  }

  listFilmFormats() {
    return this.referenceRepository.listFilmFormats();
  }

  listDevelopmentProcesses() {
    return this.referenceRepository.listDevelopmentProcesses();
  }

  listPackageTypes() {
    return this.referenceRepository.listPackageTypes();
  }

  listFilmStates() {
    return this.referenceRepository.listFilmStates();
  }

  listStorageLocations() {
    return this.referenceRepository.listStorageLocations();
  }

  listSlotStates() {
    return this.referenceRepository.listSlotStates();
  }

  listDeviceTypes() {
    return this.referenceRepository.listDeviceTypes();
  }

  listHolderTypes() {
    return this.referenceRepository.listHolderTypes();
  }

  listReferenceValues(userId: number, query: ListReferenceValuesQuery) {
    return this.referenceRepository.listReferenceValues(userId, query);
  }

  upsertReferenceValues(userId: number, values: UpsertReferenceValueInput[]) {
    return this.referenceRepository.upsertReferenceValues(userId, values);
  }

}
