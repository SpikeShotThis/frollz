import { NotFoundException } from "@nestjs/common";
import { CameraService } from "./camera.service";
import { ICameraRepository } from "../../../domain/camera/repositories/camera.repository.interface";
import { CreateCameraDto } from "../dto/CreateCameraDto";
import { UpdateCameraDto } from "../dto/UpdateCameraDto";
import { FilterCameraDto } from "../dto/FilterCameraDto";
import { Camera } from "../../../domain/camera/entities/camera.entity";
import { INoteRepository } from "../../../domain/shared/repositories/note.repository.interface";
import { Note } from "../../../domain/shared/entities/note.entity";

describe("CameraService", () => {
  let service: CameraService;
  let mockCameraRepo: jest.Mocked<ICameraRepository>;
  let mockNoteRepo: jest.Mocked<INoteRepository>;

  const makeMockNoteRepo = (): jest.Mocked<INoteRepository> => ({
    findById: jest.fn(),
    findAll: jest.fn(),
    findByEntityId: jest.fn(),
    save: jest.fn(),
  });

  const makeMockCameraRepo = (): jest.Mocked<ICameraRepository> => ({
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01"));

    service = new CameraService(
      (mockCameraRepo = makeMockCameraRepo()),
      (mockNoteRepo = makeMockNoteRepo()),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return an array of cameras", async () => {
      const filter: FilterCameraDto = {};
      const cameras: Camera[] = [
        Camera.create({ brand: "Canon", model: "EOS R", status: "active" }),
      ];
      mockCameraRepo.findAll.mockResolvedValue(cameras);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      const result = await service.findAll(filter);

      expect(mockCameraRepo.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(cameras);
    });

    it("should attach the note text to a camera that has a note", async () => {
      const camera = Camera.create({
        id: 5,
        brand: "Nikon",
        model: "FM2",
        status: "active",
      });
      mockCameraRepo.findAll.mockResolvedValue([camera]);
      mockNoteRepo.findByEntityId.mockResolvedValue([
        Note.create({
          id: 1,
          entity_id: 5,
          entity_type: "camera",
          text: "Needs repair",
          created_at: new Date(),
        }),
      ]);

      const result = await service.findAll({});

      expect(result[0].notes).toBe("Needs repair");
    });

    it("should return camera unchanged when it has no notes", async () => {
      const camera = Camera.create({
        id: 7,
        brand: "Leica",
        model: "M6",
        status: "active",
      });
      mockCameraRepo.findAll.mockResolvedValue([camera]);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(result[0].notes).toBeUndefined();
    });
  });

  describe("delete", () => {
    it("should delete a camera by id", async () => {
      const id = 1;
      mockCameraRepo.delete.mockResolvedValue(undefined);

      await service.delete(id);

      expect(mockCameraRepo.delete).toHaveBeenCalledWith(id);
    });

    it("should pass through errors from the repository", async () => {
      mockCameraRepo.delete.mockRejectedValue(new Error("FK violation"));

      await expect(service.delete(999)).rejects.toThrow("FK violation");
    });
  });

  describe("update", () => {
    it("should update and return the camera", async () => {
      const id = 1;
      const dto: UpdateCameraDto = {
        brand: "Nikon",
        model: "D5",
        status: "active",
      };
      const existing = Camera.create({
        id,
        brand: "Canon",
        model: "EOS R",
        status: "active",
      });
      const updated = Camera.create({
        id,
        brand: "Nikon",
        model: "D5",
        status: "active",
      });
      mockCameraRepo.findById.mockResolvedValue(existing);
      mockCameraRepo.update.mockResolvedValue(undefined);
      mockCameraRepo.findById.mockResolvedValue(updated);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      const result = await service.update(id, dto);

      expect(mockCameraRepo.findById).toHaveBeenCalledWith(id);
      expect(mockCameraRepo.update).toHaveBeenCalledWith(updated);
      expect(result).toEqual(updated);
    });

    it("should throw NotFoundException if camera not found", async () => {
      const id = 1;
      const dto: UpdateCameraDto = {
        brand: "Nikon",
        model: "D5",
        status: "active",
      };
      mockCameraRepo.findById.mockResolvedValue(null);

      await expect(service.update(id, dto)).rejects.toThrow(NotFoundException);
    });

    it("should save a note when dto.notes is provided on update", async () => {
      const id = 2;
      const dto: UpdateCameraDto = {
        brand: "Pentax",
        model: "K1000",
        status: "active",
        notes: "Minor scratch",
      };
      const existing = Camera.create({
        id,
        brand: "Pentax",
        model: "K1000",
        status: "active",
      });
      mockCameraRepo.findById
        .mockResolvedValueOnce(existing) // findById inside update()
        .mockResolvedValueOnce(existing); // findById inside final findById()
      mockCameraRepo.update.mockResolvedValue(undefined);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      await service.update(id, dto);

      expect(mockNoteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: id,
          entity_type: "camera",
          text: "Minor scratch",
        }),
      );
    });

    it("should not save a note when dto.notes is absent on update", async () => {
      const id = 3;
      const dto: UpdateCameraDto = {
        brand: "Nikon",
        model: "FM",
        status: "active",
      };
      const existing = Camera.create({
        id,
        brand: "Nikon",
        model: "FM",
        status: "active",
      });
      mockCameraRepo.findById.mockResolvedValue(existing);
      mockCameraRepo.update.mockResolvedValue(undefined);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      await service.update(id, dto);

      expect(mockNoteRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create and return the camera", async () => {
      const dto: CreateCameraDto = {
        brand: "Canon",
        model: "EOS R",
        status: "active",
        notes: "Great camera",
        supported_format_ids: [1, 2],
      };
      const cameraId = 1;
      const camera = Camera.create({
        id: cameraId,
        brand: "Canon",
        model: "EOS R",
        status: "active",
      });
      mockCameraRepo.save.mockResolvedValue(cameraId);
      mockCameraRepo.findById.mockResolvedValue(camera);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      const result = await service.create(dto);

      expect(mockCameraRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          brand: dto.brand,
          model: dto.model,
          status: dto.status,
          notes: dto.notes,
        }),
        dto.supported_format_ids ?? [],
      );
      expect(mockNoteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          text: dto.notes,
          entity_type: "camera",
          entity_id: cameraId,
        }),
      );
      expect(mockCameraRepo.findById).toHaveBeenCalledWith(cameraId);
      expect(result).toEqual(camera);
    });

    it("should not save a note when dto.notes is absent", async () => {
      const dto: CreateCameraDto = {
        brand: "Olympus",
        model: "OM-1",
        status: "active",
      };
      const cameraId = 2;
      const camera = Camera.create({
        id: cameraId,
        brand: "Olympus",
        model: "OM-1",
        status: "active",
      });
      mockCameraRepo.save.mockResolvedValue(cameraId);
      mockCameraRepo.findById.mockResolvedValue(camera);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      await service.create(dto);

      expect(mockNoteRepo.save).not.toHaveBeenCalled();
    });

    it("should use empty array for format ids when supported_format_ids is not provided", async () => {
      const dto: CreateCameraDto = {
        brand: "Minolta",
        model: "X-700",
        status: "active",
      };
      const cameraId = 3;
      const camera = Camera.create({
        id: cameraId,
        brand: "Minolta",
        model: "X-700",
        status: "active",
      });
      mockCameraRepo.save.mockResolvedValue(cameraId);
      mockCameraRepo.findById.mockResolvedValue(camera);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      await service.create(dto);

      expect(mockCameraRepo.save).toHaveBeenCalledWith(expect.any(Object), []);
    });
  });

  describe("findById", () => {
    it("should return the camera if found", async () => {
      const id = 1;
      const camera = Camera.create({
        id,
        brand: "Canon",
        model: "EOS R",
        status: "active",
      });
      mockCameraRepo.findById.mockResolvedValue(camera);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      const result = await service.findById(id);

      expect(mockCameraRepo.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(camera);
    });

    it("should throw NotFoundException if camera not found", async () => {
      const id = 1;
      mockCameraRepo.findById.mockResolvedValue(null);

      await expect(service.findById(id)).rejects.toThrow(NotFoundException);
    });
  });
});
