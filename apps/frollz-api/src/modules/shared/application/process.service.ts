import { Inject, Injectable } from "@nestjs/common";
import { Process } from "../../../domain/shared/entities/process.entity";
import {
  IProcessRepository,
  PROCESS_REPOSITORY,
} from "../../../domain/shared/repositories/process.repository.interface";

@Injectable()
export class ProcessService {
  constructor(
    @Inject(PROCESS_REPOSITORY)
    private readonly processRepo: IProcessRepository,
  ) {}

  findAll(): Promise<Process[]> {
    return this.processRepo.findAll();
  }
}
