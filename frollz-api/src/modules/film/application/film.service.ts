import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Film } from '../../../domain/film/entities/film.entity';
import { IFilmRepository, FILM_REPOSITORY } from '../../../domain/film/repositories/film.repository.interface';
import { IFilmTagRepository, FILM_TAG_REPOSITORY } from '../../../domain/film-tag/repositories/film-tag.repository.interface';
import { FilmState } from '../../../domain/film-state/entities/film-state.entity';
import { IFilmStateRepository, FILM_STATE_REPOSITORY } from '../../../domain/film-state/repositories/film-state.repository.interface';
import { ITransitionStateRepository, TRANSITION_STATE_REPOSITORY } from '../../../domain/transition/repositories/transition-state.repository.interface';
import { ITransitionRuleRepository, TRANSITION_RULE_REPOSITORY } from '../../../domain/transition/repositories/transition-rule.repository.interface';
import { CreateFilmDto } from '../dto/create-film.dto';
import { UpdateFilmDto } from '../dto/update-film.dto';
import { TransitionFilmDto } from '../dto/transition-film.dto';

import { randomInt } from 'crypto';

@Injectable()
export class FilmService {
  constructor(
    @Inject(FILM_REPOSITORY) private readonly filmRepo: IFilmRepository,
    @Inject(FILM_TAG_REPOSITORY) private readonly filmTagRepo: IFilmTagRepository,
    @Inject(FILM_STATE_REPOSITORY) private readonly filmStateRepo: IFilmStateRepository,
    @Inject(TRANSITION_STATE_REPOSITORY) private readonly transitionStateRepo: ITransitionStateRepository,
    @Inject(TRANSITION_RULE_REPOSITORY) private readonly transitionRuleRepo: ITransitionRuleRepository,
  ) {}

  async findAll(stateNames?: string[]): Promise<Film[]> {
    if (!stateNames || stateNames.length === 0) {
      return this.filmRepo.findAll();
    }
    const allStates = await this.transitionStateRepo.findAll();
    const stateIds = allStates
      .filter((s) => stateNames.includes(s.name))
      .map((s) => s.id);

    if (stateIds.length === 0) return [];
    return this.filmRepo.findByCurrentStateIds(stateIds);
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
    const film = Film.create({
      id: randomInt(1, 1000000),
      name: dto.name,
      emulsionId: dto.emulsionId,
      expirationDate: new Date(dto.expirationDate),
      parentId: dto.parentId ?? null,
      transitionprofileId: dto.transitionprofileId,
    });
    await this.filmRepo.save(film);
    return film;
  }

  async update(id: number, dto: UpdateFilmDto): Promise<Film> {
    const existing = await this.findById(id);
    const updated = Film.create({
      id: existing.id,
      name: dto.name ?? existing.name,
      emulsionId: dto.emulsionId ?? existing.emulsionId,
      expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : existing.expirationDate,
      parentId: existing.parentId,
      transitionprofileId: dto.transitionprofileId ?? existing.transitionprofileId,
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
        film.transitionprofileId,
      );
      const allowed = rules.some((r) => r.toStateId === targetState.id);
      if (!allowed) {
        throw new BadRequestException(
          `Transition from current state to '${dto.targetStateName}' is not permitted`,
        );
      }
    }

    const newState = FilmState.create({
      id: randomInt(1, 1000000),
      filmId: film.id,
      stateId: targetState.id,
      date: dto.date ? new Date(dto.date) : new Date(),
      note: dto.note ?? null,
    });
    await this.filmStateRepo.save(newState);

    return this.findById(filmId);
  }
}
