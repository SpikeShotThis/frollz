import { Inject, Injectable } from '@nestjs/common';
import type { CreateEmulsionRequest } from '@frollz2/schema';
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

  listEmulsions() {
    return this.referenceRepository.listEmulsions();
  }

  findEmulsionById(id: number) {
    return this.referenceRepository.findEmulsionById(id);
  }

  createEmulsion(input: CreateEmulsionRequest) {
    return this.referenceRepository.createEmulsion(input);
  }
}
