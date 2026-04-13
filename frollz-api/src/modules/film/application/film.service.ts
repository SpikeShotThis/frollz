import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Film } from '../../../domain/film/entities/film.entity';
import { IFilmRepository, FILM_REPOSITORY } from '../../../domain/film/repositories/film.repository.interface';
import { IFilmTagRepository, FILM_TAG_REPOSITORY } from '../../../domain/film-tag/repositories/film-tag.repository.interface';
import { FilmState } from '../../../domain/film-state/entities/film-state.entity';
import { IFilmStateRepository, FILM_STATE_REPOSITORY } from '../../../domain/film-state/repositories/film-state.repository.interface';
import { ITransitionStateRepository, TRANSITION_STATE_REPOSITORY } from '../../../domain/transition/repositories/transition-state.repository.interface';
import { ITransitionRuleRepository, TRANSITION_RULE_REPOSITORY } from '../../../domain/transition/repositories/transition-rule.repository.interface';
import { ITransitionStateMetadataRepository, TRANSITION_STATE_METADATA_REPOSITORY } from '../../../domain/transition/repositories/transition-state-metadata.repository.interface';
import { ITransitionMetadataFieldRepository, TRANSITION_METADATA_FIELD_REPOSITORY } from '../../../domain/transition/repositories/transition-metadata-field.repository.interface';
import { FilmFilters } from '../../../domain/film/repositories/film.repository.interface';
import { CreateFilmDto } from '../dto/create-film.dto';
import { UpdateFilmDto } from '../dto/update-film.dto';
import { TransitionFilmDto } from '../dto/transition-film.dto';

export interface FilmFindAllParams {
  stateNames?: string[];
  emulsionId?: number;
  formatId?: number;
  tagIds?: number[];
  from?: string;
  to?: string;
  q?: string;
}

@Injectable()
export class FilmService {
  constructor(
    @Inject(FILM_REPOSITORY) private readonly filmRepo: IFilmRepository,
    @Inject(FILM_TAG_REPOSITORY) private readonly filmTagRepo: IFilmTagRepository,
    @Inject(FILM_STATE_REPOSITORY) private readonly filmStateRepo: IFilmStateRepository,
    @Inject(TRANSITION_STATE_REPOSITORY) private readonly transitionStateRepo: ITransitionStateRepository,
    @Inject(TRANSITION_RULE_REPOSITORY) private readonly transitionRuleRepo: ITransitionRuleRepository,
    @Inject(TRANSITION_STATE_METADATA_REPOSITORY) private readonly transitionStateMetadataRepo: ITransitionStateMetadataRepository,
    @Inject(TRANSITION_METADATA_FIELD_REPOSITORY) private readonly metadataFieldRepo: ITransitionMetadataFieldRepository,
  ) {}

  async findAll(params: FilmFindAllParams = {}): Promise<Film[]> {
    const filters: FilmFilters = {};

    const needsStates = params.stateNames?.length || params.from || params.to;
    const allStates = needsStates ? await this.transitionStateRepo.findAll() : [];

    if (params.stateNames?.length) {
      const stateIds = allStates
        .filter((s) => params.stateNames!.includes(s.name))
        .map((s) => s.id);
      if (stateIds.length === 0) return [];
      filters.stateIds = stateIds;
    }

    if (params.emulsionId !== undefined) filters.emulsionId = params.emulsionId;
    if (params.formatId !== undefined) filters.formatId = params.formatId;
    if (params.tagIds?.length) filters.tagIds = params.tagIds;
    if (params.q?.trim()) filters.searchQuery = params.q.trim();

    if (params.from || params.to) {
      const loadedState = allStates.find((s) => s.name === 'Loaded');
      if (loadedState) {
        filters.loadedStateId = loadedState.id;
        if (params.from) filters.loadedDateFrom = new Date(`${params.from}T00:00:00.000Z`);
        if (params.to) filters.loadedDateTo = new Date(`${params.to}T23:59:59.999Z`);
      }
    }

    const hasFilters = Object.keys(filters).length > 0;
    return hasFilters ? this.filmRepo.findWithFilters(filters) : this.filmRepo.findAll();
  }

  async findById(id: number): Promise<Film> {
    const film = await this.filmRepo.findById(id);
    if (!film) throw new NotFoundException(`Film '${id}' not found`);
    return film;
  }

  findChildren(parentId: number): Promise<Film[]> {
    return this.filmRepo.findChildren(parentId);
  }

  async create(dto: CreateFilmDto): Promise<Film> {
    const addedState = await this.transitionStateRepo.findByName('Added');
    if (!addedState) throw new NotFoundException(`Initial state 'Added' not found`);

    const film = Film.create({
      name: dto.name,
      emulsionId: dto.emulsionId,
      expirationDate: new Date(dto.expirationDate),
      parentId: dto.parentId ?? null,
      transitionProfileId: dto.transitionProfileId,
    });
    const id = await this.filmRepo.save(film);

    const initialState = FilmState.create({
      filmId: id,
      stateId: addedState.id,
      date: new Date(),
      note: null,
    });
    await this.filmStateRepo.save(initialState);

    return this.findById(id);
  }

  async update(id: number, dto: UpdateFilmDto): Promise<Film> {
    const existing = await this.findById(id);
    const updated = Film.create({
      id: existing.id,
      name: dto.name ?? existing.name,
      emulsionId: dto.emulsionId ?? existing.emulsionId,
      expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : existing.expirationDate,
      parentId: existing.parentId,
      transitionProfileId: dto.transitionProfileId ?? existing.transitionProfileId,
    });
    await this.filmRepo.update(updated);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);
    await this.filmRepo.delete(id);
  }

  async addTag(filmId: number, tagId: number): Promise<void> {
    await this.findById(filmId);
    await this.filmTagRepo.add(filmId, tagId);
  }

  async removeTag(filmId: number, tagId: number): Promise<void> {
    await this.findById(filmId);
    await this.filmTagRepo.remove(filmId, tagId);
  }

  async transition(filmId: number, dto: TransitionFilmDto): Promise<Film> {
    const film = await this.findById(filmId);

    const targetState = await this.transitionStateRepo.findByName(dto.targetStateName);
    if (!targetState) throw new NotFoundException(`State '${dto.targetStateName}' not found`);

    const currentState = film.currentState;
    if (currentState) {
      const rules = await this.transitionRuleRepo.findByFromStateAndProfile(
        currentState.stateId,
        film.transitionProfileId,
      );
      const allowed = rules.some((r) => r.toStateId === targetState.id);
      if (!allowed) {
        throw new BadRequestException(
          `Transition from current state to '${dto.targetStateName}' is not permitted`,
        );
      }
    }

    const newState = FilmState.create({
      filmId: film.id,
      stateId: targetState.id,
      date: dto.date ? new Date(dto.date) : new Date(),
      note: dto.note ?? null,
    });
    const newStateId = await this.filmStateRepo.save(newState);

    if (dto.metadata && Object.keys(dto.metadata).length > 0) {
      await this.saveTransitionMetadata(targetState.id, newStateId, dto.metadata);
    }

    return this.findById(filmId);
  }

  private async saveTransitionMetadata(
    targetStateId: number,
    filmStateId: number,
    metadataInput: Record<string, string | string[]>,
  ): Promise<void> {
    const stateMetadataFields = await this.transitionStateMetadataRepo.findByTransitionStateId(targetStateId);

    for (const tsm of stateMetadataFields) {
      const field = await this.metadataFieldRepo.findById(tsm.fieldId);
      if (!field) continue;

      const inputValue = metadataInput[field.name];
      if (inputValue === undefined) continue;

      if (field.allowMultiple) {
        // One row per value — no JSON serialization
        const values = Array.isArray(inputValue) ? inputValue : [inputValue];
        for (const v of values) {
          if (field.fieldType === 'string') this.validateHttpsUrl(v, field.name);
          await this.filmStateRepo.saveMetadataValue(filmStateId, tsm.id, v);
        }
      } else {
        const scalar = Array.isArray(inputValue) ? inputValue[0] : inputValue;
        await this.filmStateRepo.saveMetadataValue(filmStateId, tsm.id, scalar);
      }
    }
  }

  private validateHttpsUrl(url: string, fieldName: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException(`Metadata field '${fieldName}' contains an invalid URL: ${url}`);
    }
    if (parsed.protocol !== 'https:') {
      throw new BadRequestException(
        `Metadata field '${fieldName}' only accepts https:// URLs, got: ${url}`,
      );
    }
  }
}
