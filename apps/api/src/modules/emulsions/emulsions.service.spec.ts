import { describe, expect, it, vi } from 'vitest';
import { EmulsionsService } from './emulsions.service.js';

describe('EmulsionsService', () => {
  it('throws not found when update target is missing', async () => {
    const repo = {
      list: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
      isInUse: vi.fn()
    };
    const referenceService = { upsertReferenceValues: vi.fn() };
    const service = new EmulsionsService(repo as never, referenceService as never);

    await expect(
      service.update(1, 123, {
        manufacturer: 'A',
        brand: 'B',
        isoSpeed: 100,
        developmentProcessId: 1,
        filmFormatIds: [1]
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws conflict when deleting in-use emulsion', async () => {
    const repo = {
      list: vi.fn(),
      findById: vi.fn().mockResolvedValue({ id: 99 }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      isInUse: vi.fn().mockResolvedValue(true)
    };
    const referenceService = { upsertReferenceValues: vi.fn() };
    const service = new EmulsionsService(repo as never, referenceService as never);

    await expect(service.delete(99)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
