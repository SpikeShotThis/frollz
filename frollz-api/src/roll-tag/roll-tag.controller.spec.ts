import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { RollTagController } from "./roll-tag.controller";
import { RollTagService } from "./roll-tag.service";

describe("RollTagController", () => {
  let controller: RollTagController;
  let service: jest.Mocked<RollTagService>;

  const mockRollTag = {
    _key: "abc123",
    rollKey: "roll-portra-400-2024-01-01",
    tagKey: "color",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RollTagController],
      providers: [
        {
          provide: RollTagService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findByRoll: jest.fn(),
            findByTag: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RollTagController>(RollTagController);
    service = module.get(RollTagService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("should return the created roll-tag association", async () => {
      service.create.mockResolvedValue(mockRollTag);

      const result = await controller.create({
        rollKey: "roll-portra-400-2024-01-01",
        tagKey: "color",
      });

      expect(service.create).toHaveBeenCalledWith({
        rollKey: "roll-portra-400-2024-01-01",
        tagKey: "color",
      });
      expect(result).toEqual(mockRollTag);
    });
  });

  describe("findAll", () => {
    it("should call findByRoll when rollKey query param is provided", async () => {
      service.findByRoll.mockResolvedValue([mockRollTag]);

      const result = await controller.findAll(
        "roll-portra-400-2024-01-01",
        undefined,
      );

      expect(service.findByRoll).toHaveBeenCalledWith(
        "roll-portra-400-2024-01-01",
      );
      expect(service.findByTag).not.toHaveBeenCalled();
      expect(service.findAll).not.toHaveBeenCalled();
      expect(result).toEqual([mockRollTag]);
    });

    it("should call findByTag when tagKey query param is provided", async () => {
      service.findByTag.mockResolvedValue([mockRollTag]);

      const result = await controller.findAll(undefined, "color");

      expect(service.findByTag).toHaveBeenCalledWith("color");
      expect(service.findByRoll).not.toHaveBeenCalled();
      expect(service.findAll).not.toHaveBeenCalled();
      expect(result).toEqual([mockRollTag]);
    });

    it("should call findAll when no filter params are provided", async () => {
      service.findAll.mockResolvedValue([mockRollTag]);

      const result = await controller.findAll(undefined, undefined);

      expect(service.findAll).toHaveBeenCalled();
      expect(service.findByRoll).not.toHaveBeenCalled();
      expect(service.findByTag).not.toHaveBeenCalled();
      expect(result).toEqual([mockRollTag]);
    });

    it("should prefer rollKey over tagKey when both are provided", async () => {
      service.findByRoll.mockResolvedValue([mockRollTag]);

      await controller.findAll("roll-portra-400-2024-01-01", "color");

      expect(service.findByRoll).toHaveBeenCalled();
      expect(service.findByTag).not.toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return the roll-tag when found", async () => {
      service.findOne.mockResolvedValue(mockRollTag);

      const result = await controller.findOne("abc123");

      expect(result).toEqual(mockRollTag);
    });

    it("should throw NotFoundException when not found", async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("should return a success message when deleted", async () => {
      service.remove.mockResolvedValue(true);

      const result = await controller.remove("abc123");

      expect(result).toEqual({ message: "RollTag deleted successfully" });
    });

    it("should throw NotFoundException when not found", async () => {
      service.remove.mockResolvedValue(false);

      await expect(controller.remove("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
