import { BadRequestException } from "@nestjs/common";
import { randomInt } from "crypto";
import { ImportService } from "./import.service";
import { IFilmRepository } from "../../../domain/film/repositories/film.repository.interface";
import { IFilmStateRepository } from "../../../domain/film-state/repositories/film-state.repository.interface";
import { IFilmTagRepository } from "../../../domain/film-tag/repositories/film-tag.repository.interface";
import { IEmulsionRepository } from "../../../domain/emulsion/repositories/emulsion.repository.interface";
import { ITagRepository } from "../../../domain/shared/repositories/tag.repository.interface";
import { ITransitionStateRepository } from "../../../domain/transition/repositories/transition-state.repository.interface";
import { ITransitionProfileRepository } from "../../../domain/transition/repositories/transition-profile.repository.interface";
import { Emulsion } from "../../../domain/emulsion/entities/emulsion.entity";
import { Tag } from "../../../domain/shared/entities/tag.entity";
import { TransitionState } from "../../../domain/transition/entities/transition-state.entity";
import { TransitionProfile } from "../../../domain/transition/entities/transition-profile.entity";
import { INoteRepository } from "../../../domain/shared/repositories/note.repository.interface";

const randomId = () => randomInt(1, 1_000_000);

const makeEmulsion = (brand = "Kodak Portra 400"): Emulsion =>
  Emulsion.create({
    id: randomId(),
    brand,
    manufacturer: "Kodak",
    speed: 400,
    processId: randomId(),
    formatId: randomId(),
  });

const makeTag = (name = "landscape"): Tag =>
  Tag.create({ id: randomId(), name, colorCode: "#6B7280" });

const makeTransitionState = (name = "Imported"): TransitionState =>
  TransitionState.create({ id: randomId(), name });

const makeTransitionProfile = (name = "standard"): TransitionProfile =>
  TransitionProfile.create({ id: randomId(), name });

const makeFilmRepo = (
  overrides: Partial<IFilmRepository> = {},
): IFilmRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findWithFilters: jest.fn().mockResolvedValue([]),
  findByEmulsionId: jest.fn().mockResolvedValue([]),
  findChildren: jest.fn().mockResolvedValue([]),
  findByCurrentStateIds: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeFilmStateRepo = (
  overrides: Partial<IFilmStateRepository> = {},
): IFilmStateRepository => ({
  findById: jest.fn().mockResolvedValue(null),
  findByFilmId: jest.fn().mockResolvedValue([]),
  findLatestByFilmId: jest.fn().mockResolvedValue(null),
  findFilmIdsByCurrentState: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  saveMetadataValue: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeFilmTagRepo = (
  overrides: Partial<IFilmTagRepository> = {},
): IFilmTagRepository => ({
  add: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeEmulsionRepo = (
  overrides: Partial<IEmulsionRepository> = {},
): IEmulsionRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByBrand: jest.fn().mockResolvedValue(null),
  findByProcessId: jest.fn().mockResolvedValue([]),
  findByFormatId: jest.fn().mockResolvedValue([]),
  findBrands: jest.fn().mockResolvedValue([]),
  findManufacturers: jest.fn().mockResolvedValue([]),
  findSpeeds: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  updateBoxImage: jest.fn().mockResolvedValue(undefined),
  getBoxImage: jest.fn().mockResolvedValue(null),
  ...overrides,
});

const makeTagRepo = (
  overrides: Partial<ITagRepository> = {},
): ITagRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(randomId()),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeTransitionStateRepo = (
  state: TransitionState,
  overrides: Partial<ITransitionStateRepository> = {},
): ITransitionStateRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(state),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeTransitionProfileRepo = (
  profile: TransitionProfile,
  overrides: Partial<ITransitionProfileRepository> = {},
): ITransitionProfileRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(profile),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeNoteRepo = (
  overrides: Partial<INoteRepository> = {},
): INoteRepository => ({
  findById: jest.fn().mockResolvedValue(null),
  findAll: jest.fn().mockResolvedValue([]),
  findByEntityId: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(randomId()),
  ...overrides,
});

const csv = (rows: string[]) =>
  Buffer.from([`name,emulsion,tags,notes`, ...rows].join("\n"));

describe("ImportService", () => {
  let service: ImportService;
  let filmRepo: jest.Mocked<IFilmRepository>;
  let filmStateRepo: jest.Mocked<IFilmStateRepository>;
  let filmTagRepo: jest.Mocked<IFilmTagRepository>;
  let emulsionRepo: jest.Mocked<IEmulsionRepository>;
  let tagRepo: jest.Mocked<ITagRepository>;
  let transitionStateRepo: jest.Mocked<ITransitionStateRepository>;
  let transitionProfileRepo: jest.Mocked<ITransitionProfileRepository>;
  let noteRepo: jest.Mocked<INoteRepository>;

  const importedState = makeTransitionState("Imported");
  const standardProfile = makeTransitionProfile("standard");
  const portra = makeEmulsion("Kodak Portra 400");

  beforeEach(() => {
    filmRepo = makeFilmRepo() as jest.Mocked<IFilmRepository>;
    filmStateRepo = makeFilmStateRepo() as jest.Mocked<IFilmStateRepository>;
    filmTagRepo = makeFilmTagRepo() as jest.Mocked<IFilmTagRepository>;
    emulsionRepo = makeEmulsionRepo({
      findByBrand: jest.fn().mockResolvedValue(portra),
    }) as jest.Mocked<IEmulsionRepository>;
    tagRepo = makeTagRepo() as jest.Mocked<ITagRepository>;
    transitionStateRepo = makeTransitionStateRepo(
      importedState,
    ) as jest.Mocked<ITransitionStateRepository>;
    transitionProfileRepo = makeTransitionProfileRepo(
      standardProfile,
    ) as jest.Mocked<ITransitionProfileRepository>;
    noteRepo = makeNoteRepo() as jest.Mocked<INoteRepository>;

    service = new ImportService(
      filmRepo,
      filmStateRepo,
      filmTagRepo,
      emulsionRepo,
      tagRepo,
      transitionStateRepo,
      transitionProfileRepo,
      noteRepo,
    );
  });

  describe("getTemplate", () => {
    it("returns a CSV string with the header row and one example row", () => {
      const result = service.getTemplate();
      const lines = result.trim().split("\n");
      expect(lines[0]).toBe("name,emulsion,tags,notes");
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe("importFilms", () => {
    it("throws BadRequestException when Imported state is not seeded", async () => {
      transitionStateRepo.findByName = jest.fn().mockResolvedValue(null);
      await expect(
        service.importFilms(csv(["Roll 001,Kodak Portra 400,,"])),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when standard profile is not seeded", async () => {
      transitionProfileRepo.findByName = jest.fn().mockResolvedValue(null);
      await expect(
        service.importFilms(csv(["Roll 001,Kodak Portra 400,,"])),
      ).rejects.toThrow(BadRequestException);
    });

    it("imports a valid row successfully", async () => {
      const result = await service.importFilms(
        csv(["Roll 001,Kodak Portra 400,,"]),
      );
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(filmRepo.save).toHaveBeenCalledTimes(1);
      expect(filmStateRepo.save).toHaveBeenCalledTimes(1);
    });

    it("skips a row missing the name field", async () => {
      const result = await service.importFilms(csv([",Kodak Portra 400,,"]));
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors[0]).toMatchObject({
        row: 2,
        reason: expect.stringContaining("name"),
      });
    });

    it("skips a row missing the emulsion field", async () => {
      const result = await service.importFilms(csv(["Roll 001,,,"]));
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors[0]).toMatchObject({
        row: 2,
        reason: expect.stringContaining("emulsion"),
      });
    });

    it("skips a row where the emulsion name is not found", async () => {
      emulsionRepo.findByBrand = jest.fn().mockResolvedValue(null);
      const result = await service.importFilms(
        csv(["Roll 001,Unknown Emulsion,,"]),
      );
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors[0].reason).toContain("Unknown emulsion");
    });

    it("creates tags that do not already exist with default color", async () => {
      const newTagId = randomId();
      const newTag = makeTag("nature");
      tagRepo.findByName = jest.fn().mockResolvedValue(null);
      tagRepo.save = jest.fn().mockResolvedValue(newTagId);
      tagRepo.findById = jest.fn().mockResolvedValue(newTag);

      await service.importFilms(csv(["Roll 001,Kodak Portra 400,nature,"]));

      expect(tagRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ colorCode: "#6B7280" }),
      );
      expect(filmTagRepo.add).toHaveBeenCalledTimes(1);
    });

    it("reuses existing tags without creating duplicates", async () => {
      const existingTag = makeTag("landscape");
      tagRepo.findByName = jest.fn().mockResolvedValue(existingTag);

      await service.importFilms(csv(["Roll 001,Kodak Portra 400,landscape,"]));

      expect(tagRepo.save).not.toHaveBeenCalled();
      expect(filmTagRepo.add).toHaveBeenCalledWith(
        expect.any(Number),
        existingTag.id,
      );
    });

    it("stores notes as the FilmState note", async () => {
      await service.importFilms(
        csv(["Roll 001,Kodak Portra 400,,Shot in Portugal"]),
      );

      expect(filmStateRepo.save).toHaveBeenCalledTimes(1);
      expect(noteRepo.save).toHaveBeenCalledTimes(1);
      expect(noteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "Shot in Portugal",
          entity_type: "film_state",
        }),
      );
    });

    it("handles pipe-separated tags correctly", async () => {
      const tag1 = makeTag("landscape");
      const tag2 = makeTag("expired");
      tagRepo.findByName = jest
        .fn()
        .mockResolvedValueOnce(tag1)
        .mockResolvedValueOnce(tag2);

      await service.importFilms(
        csv(["Roll 001,Kodak Portra 400,landscape|expired,"]),
      );

      expect(filmTagRepo.add).toHaveBeenCalledTimes(2);
    });

    it("continues processing remaining rows after a skipped row", async () => {
      emulsionRepo.findByBrand = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(portra);

      const result = await service.importFilms(
        csv(["Roll 001,Unknown Emulsion,,", "Roll 002,Kodak Portra 400,,"]),
      );

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it("returns correct counts for a mixed batch", async () => {
      // Row 1: valid; Row 2: missing name (skipped before emulsion lookup); Row 3: valid
      emulsionRepo.findByBrand = jest.fn().mockResolvedValue(portra);

      const result = await service.importFilms(
        csv([
          "Roll 001,Kodak Portra 400,,",
          ",Kodak Portra 400,,",
          "Roll 003,Kodak Portra 400,,",
        ]),
      );

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(1);
    });
  });
});
