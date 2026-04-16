import { Inject, Injectable } from "@nestjs/common";
import { Package } from "../../../domain/shared/entities/package.entity";
import {
  IPackageRepository,
  PACKAGE_REPOSITORY,
} from "../../../domain/shared/repositories/package.repository.interface";

@Injectable()
export class PackageService {
  constructor(
    @Inject(PACKAGE_REPOSITORY)
    private readonly packageRepo: IPackageRepository,
  ) {}

  findAll(): Promise<Package[]> {
    return this.packageRepo.findAll();
  }
}
