import { randomInt } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { EmulsionService } from './emulsion.service';
import { IEmulsionRepository } from '../../../domain/emulsion/repositories/emulsion.repository.interface';
import { IEmulsionTagRepository } from '../../../domain/emulsion-tag/repositories/emulsion-tag.repository.interface';
import { Emulsion } from '../../../domain/emulsion/entities/emulsion.entity';


const randomId = () => randomInt(1, 1000000)

const makeEmulsion = (overrides: Partial<Parameters<typeof Emulsion.create>[0]> = {}): Emulsion =>
  Emulsion.create({
    id: randomId(),
    name: 'Portra 400',
    brand: 'Kodak',
    manufacturer: 'Kodak',
    speed: 400,
    processId: randomId(),
    formatId: randomId(),
    parentId: null,
    ...overrides,
  });

const makeRepo = (overrides: Partial<IEmulsionRepository> = {}): IEmulsionRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByProcess: jest.fn().mockResolvedValue([]),
  findByFormat: jest.fn().mockResolvedValue([]),
  findBrands: jest.fn().mockResolvedValue([]),
  findManufacturers: jest.fn().mockResolvedValue([]),
  findSpeeds: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeTagRepo = (overrides: Partial<IEmulsionTagRepository> = {}): IEmulsionTagRepository => ({
  add: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('EmulsionService', () => {
  describe('findById', () => {
    it('returns the emulsion when found', async () => {
      const emulsion = makeEmulsion();
      const service = new EmulsionService(
        makeRepo({ findById: jest.fn().mockResolvedValue(emulsion) }),
        makeTagRepo(),
      );

      await expect(service.findById(emulsion.id)).resolves.toEqual(emulsion);
    });

    it('throws NotFoundException when not found', async () => {
      const service = new EmulsionService(makeRepo(), makeTagRepo());

      await expect(service.findById(randomId())).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('saves and returns a new emulsion with a generated uuid', async () => {
      const repo = makeRepo();
      const service = new EmulsionService(repo, makeTagRepo());

      const result = await service.create({
        name: 'Portra 400',
        brand: 'Kodak',
        manufacturer: 'Kodak',
        speed: 400,
        processId: randomId(),
        formatId: randomId(),
      });

      expect(result.name).toBe('Portra 400');
      expect(repo.save).toHaveBeenCalledWith(result);
    });
  });

  describe('createMultipleFormats', () => {
    it('creates one emulsion per formatId', async () => {
      const repo = makeRepo();
      const service = new EmulsionService(repo, makeTagRepo());
      const formatIds = [randomId(), randomId()];

      const results = await service.createMultipleFormats({
        name: 'HP5',
        brand: 'Ilford',
        manufacturer: 'Ilford',
        speed: 400,
        processId: randomId(),
        formatIds,
      });

      expect(results).toHaveLength(2);
      expect(results[0].formatId).toBe(formatIds[0]);
      expect(results[1].formatId).toBe(formatIds[1]);
      expect(repo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('update', () => {
    it('merges partial changes onto the existing emulsion', async () => {
      const existing = makeEmulsion();
      const afterUpdate = makeEmulsion({ id: existing.id, speed: 800 });
      const repo = makeRepo({
        findById: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(afterUpdate),
      });
      const service = new EmulsionService(repo, makeTagRepo());

      const result = await service.update(existing.id, { speed: 800 });

      expect(repo.update).toHaveBeenCalled();
      expect(result.speed).toBe(800);
    });

    it('throws NotFoundException when emulsion not found', async () => {
      const service = new EmulsionService(makeRepo(), makeTagRepo());

      await expect(service.update(randomId(), { speed: 800 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('addTag / removeTag', () => {
    it('adds a tag association to an existing emulsion', async () => {
      const emulsion = makeEmulsion();
      const tagRepo = makeTagRepo();
      const tagId = randomId();
      const service = new EmulsionService(
        makeRepo({ findById: jest.fn().mockResolvedValue(emulsion) }),
        tagRepo,
      );

      await service.addTag(emulsion.id, tagId);

      expect(tagRepo.add).toHaveBeenCalledWith(emulsion.id, tagId);
    });

    it('removes a tag association from an existing emulsion', async () => {
      const emulsion = makeEmulsion();
      const tagRepo = makeTagRepo();
      const tagId = randomId();
      const service = new EmulsionService(
        makeRepo({ findById: jest.fn().mockResolvedValue(emulsion) }),
        tagRepo,
      );

      await service.removeTag(emulsion.id, tagId);

      expect(tagRepo.remove).toHaveBeenCalledWith(emulsion.id, tagId);
    });

    it('throws NotFoundException when emulsion not found', async () => {
      const service = new EmulsionService(makeRepo(), makeTagRepo());

      await expect(service.addTag(randomId(), randomId())).rejects.toThrow(NotFoundException);
    });
  });

  describe('typeahead', () => {
    it('delegates findBrands with query to repository', async () => {
      const repo = makeRepo({ findBrands: jest.fn().mockResolvedValue(['Kodak', 'Ilford']) });
      const service = new EmulsionService(repo, makeTagRepo());

      const result = await service.findBrands('Ko');

      expect(result).toEqual(['Kodak', 'Ilford']);
      expect(repo.findBrands).toHaveBeenCalledWith('Ko');
    });
  });
});
