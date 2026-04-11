import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Format } from '../../../domain/shared/entities/format.entity';
import { IFormatRepository, FORMAT_REPOSITORY } from '../../../domain/shared/repositories/format.repository.interface';
import { IPackageRepository, PACKAGE_REPOSITORY } from '../../../domain/shared/repositories/package.repository.interface';

@Injectable()
export class FormatService {
  constructor(
    @Inject(FORMAT_REPOSITORY) private readonly formatRepo: IFormatRepository,
    @Inject(PACKAGE_REPOSITORY) private readonly packageRepo: IPackageRepository,
  ) {}

  async findAll(): Promise<Format[]> {
    const formats = await this.formatRepo.findAll();
    return Promise.all(formats.map((f) => this.withPackage(f)));
  }

  async findById(id: number): Promise<Format> {
    const format = await this.formatRepo.findById(id);
    if (!format) throw new NotFoundException(`Format '${id}' not found`);
    return this.withPackage(format);
  }

  async create(data: { packageId: number; name: string }): Promise<Format> {
    const format = Format.create({ packageId: data.packageId, name: data.name });
    const id = await this.formatRepo.save(format);
    return this.findById(id);
  }

  async update(id: number, data: { packageId?: number; name?: string }): Promise<Format> {
    const existing = await this.findById(id);
    const updated = Format.create({
      id: existing.id,
      packageId: data.packageId ?? existing.packageId,
      name: data.name ?? existing.name,
    });
    await this.formatRepo.update(updated);
    return this.withPackage(updated);
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);
    await this.formatRepo.delete(id);
  }

  private async withPackage(format: Format): Promise<Format> {
    const pkg = await this.packageRepo.findById(format.packageId);
    return Format.create({ id: format.id, packageId: format.packageId, name: format.name, pkg: pkg ?? undefined });
  }
}
