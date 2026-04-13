import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Film } from '../../../domain/film/entities/film.entity';
import { IFilmRepository, FILM_REPOSITORY } from '../../../domain/film/repositories/film.repository.interface';
import { FilmState } from '../../../domain/film-state/entities/film-state.entity';
import { IFilmStateRepository, FILM_STATE_REPOSITORY } from '../../../domain/film-state/repositories/film-state.repository.interface';
import { IFilmTagRepository, FILM_TAG_REPOSITORY } from '../../../domain/film-tag/repositories/film-tag.repository.interface';
import { IEmulsionRepository, EMULSION_REPOSITORY } from '../../../domain/emulsion/repositories/emulsion.repository.interface';
import { Tag } from '../../../domain/shared/entities/tag.entity';
import { ITagRepository, TAG_REPOSITORY } from '../../../domain/shared/repositories/tag.repository.interface';
import { ITransitionStateRepository, TRANSITION_STATE_REPOSITORY } from '../../../domain/transition/repositories/transition-state.repository.interface';
import { ITransitionProfileRepository, TRANSITION_PROFILE_REPOSITORY } from '../../../domain/transition/repositories/transition-profile.repository.interface';

export interface FilmsJsonImportError {
  index: number;
  name: string;
  reason: string;
}

export interface FilmsJsonImportResult {
  imported: number;
  skipped: number;
  errors: FilmsJsonImportError[];
}

const DEFAULT_EXPIRATION = new Date('2099-12-31');
const DEFAULT_TAG_COLOR = '#6B7280';

interface StatePayload { stateId: number; date: string; note?: string | null; state?: { id: number; name: string } }
interface TagPayload { name: string }
interface FilmPayload { name?: string; emulsion?: { brand: string; name?: string } | null; expirationDate?: string; tags?: TagPayload[]; states?: StatePayload[] }
interface FilmsEnvelope { version?: string; films?: FilmPayload[] }

@Injectable()
export class FilmsJsonImportService {
  private readonly logger = new Logger(FilmsJsonImportService.name);

  constructor(
    @Inject(FILM_REPOSITORY) private readonly filmRepo: IFilmRepository,
    @Inject(FILM_STATE_REPOSITORY) private readonly filmStateRepo: IFilmStateRepository,
    @Inject(FILM_TAG_REPOSITORY) private readonly filmTagRepo: IFilmTagRepository,
    @Inject(EMULSION_REPOSITORY) private readonly emulsionRepo: IEmulsionRepository,
    @Inject(TAG_REPOSITORY) private readonly tagRepo: ITagRepository,
    @Inject(TRANSITION_STATE_REPOSITORY) private readonly transitionStateRepo: ITransitionStateRepository,
    @Inject(TRANSITION_PROFILE_REPOSITORY) private readonly transitionProfileRepo: ITransitionProfileRepository,
  ) {}

  async importFilmsJson(buffer: Buffer): Promise<FilmsJsonImportResult> {
    let envelope: FilmsEnvelope;
    try {
      envelope = JSON.parse(buffer.toString('utf-8')) as FilmsEnvelope;
    } catch {
      throw new BadRequestException('Invalid JSON — ensure the file is a valid films.json export');
    }

    const currentVersion = process.env.APP_VERSION ?? 'unknown';
    if (envelope.version && envelope.version !== currentVersion) {
      this.logger.warn(
        `Films JSON import version mismatch: file is ${envelope.version}, server is ${currentVersion}`,
      );
    }

    const standardProfile = await this.transitionProfileRepo.findByName('standard');
    if (!standardProfile) throw new BadRequestException("Transition profile 'standard' is not seeded");

    // Preload all transition states for name-based lookup
    const allStates = await this.transitionStateRepo.findAll();
    const stateByName = new Map(allStates.map((s) => [s.name, s]));

    const films: FilmPayload[] = envelope.films ?? [];
    const errors: FilmsJsonImportError[] = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < films.length; i++) {
      const filmData = films[i];
      const filmName: string = filmData.name ?? `(unnamed film at index ${i + 1})`;

      if (!filmData.states || filmData.states.length === 0) {
        errors.push({ index: i + 1, name: filmName, reason: 'Film has no state history — skipped' });
        skipped++;
        continue;
      }

      const emulsionBrand: string | undefined = filmData.emulsion?.brand ?? filmData.emulsion?.name;
      if (!emulsionBrand) {
        errors.push({ index: i + 1, name: filmName, reason: 'Film has no emulsion — skipped' });
        skipped++;
        continue;
      }

      const emulsion = await this.emulsionRepo.findByBrand(emulsionBrand);
      if (!emulsion) {
        errors.push({ index: i + 1, name: filmName, reason: `Unknown emulsion: "${emulsionBrand}"` });
        skipped++;
        continue;
      }

      try {
        const film = Film.create({
          name: filmName,
          emulsionId: emulsion.id,
          expirationDate: filmData.expirationDate ? new Date(filmData.expirationDate) : DEFAULT_EXPIRATION,
          parentId: null, // parent-child links not reconstructed
          transitionProfileId: standardProfile.id,
        });
        const filmId = await this.filmRepo.save(film);

        // Reconstruct state history in chronological order
        const sortedStates = [...filmData.states].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        for (const stateData of sortedStates) {
          const stateName: string | undefined = stateData.state?.name;
          if (!stateName) continue;
          const localState = stateByName.get(stateName);
          if (!localState) {
            this.logger.warn(`Unknown transition state "${stateName}" encountered during import of film "${filmName}" — state record skipped`);
            continue;
          }
          await this.filmStateRepo.save(
            FilmState.create({
              filmId,
              stateId: localState.id,
              date: new Date(stateData.date),
              note: stateData.note ?? null,
            }),
          );
        }

        // Reconstruct tags
        for (const tagData of filmData.tags ?? []) {
          if (!tagData.name) continue;
          const tag = await this.findOrCreateTag(tagData.name);
          await this.filmTagRepo.add(filmId, tag.id);
        }

        imported++;
      } catch {
        errors.push({ index: i + 1, name: filmName, reason: 'Internal error saving film — skipped' });
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  private async findOrCreateTag(name: string): Promise<Tag> {
    const existing = await this.tagRepo.findByName(name);
    if (existing) return existing;
    const newTag = Tag.create({ name, colorCode: DEFAULT_TAG_COLOR });
    const newId = await this.tagRepo.save(newTag);
    return (await this.tagRepo.findById(newId))!;
  }
}
