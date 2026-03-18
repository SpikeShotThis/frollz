import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { RollService } from "./roll.service";
import { DatabaseService } from "../database/database.service";
import { RollStateService } from "../roll-state/roll-state.service";
import { RollTagService } from "../roll-tag/roll-tag.service";
import { RollState } from "./entities/roll.entity";

const makeDbService = (
  overrides: Partial<{ query: jest.Mock; execute: jest.Mock }> = {},
) => ({
  query: jest.fn().mockResolvedValue([]),
  execute: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeRollStateService = () => ({
  create: jest.fn().mockResolvedValue({}),
  findByRollKey: jest.fn().mockResolvedValue([]),
});

const makeRollTagService = () => ({
  syncAutoTag: jest.fn().mockResolvedValue(undefined),
});

describe("RollService", () => {
  let service: RollService;
  let db: ReturnType<typeof makeDbService>;
  let rollStateService: ReturnType<typeof makeRollStateService>;
  let rollTagService: ReturnType<typeof makeRollTagService>;

  beforeEach(async () => {
    db = makeDbService();
    rollStateService = makeRollStateService();
    rollTagService = makeRollTagService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RollService,
        { provide: DatabaseService, useValue: db },
        { provide: RollStateService, useValue: rollStateService },
        { provide: RollTagService, useValue: rollTagService },
      ],
    }).compile();

    service = module.get<RollService>(RollService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    const baseDto = {
      stockKey: "stock-1",
      rollId: "roll-00001",
      state: RollState.ADDED,
      obtainmentMethod: "Purchase" as any,
      obtainedFrom: "B&H",
      timesExposedToXrays: 0,
    };

    it("should insert a roll_states entry with the initial state on creation", async () => {
      await service.create(baseDto);

      expect(rollStateService.create).toHaveBeenCalledTimes(1);
      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({ state: RollState.ADDED }),
      );
    });

    it("should use the provided state (not just ADDED) when creating the initial history entry", async () => {
      await service.create({ ...baseDto, state: RollState.SHELVED });

      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({ state: RollState.SHELVED }),
      );
    });

    it("should use the roll id as rollKey in the initial state entry", async () => {
      await service.create(baseDto);

      const call = rollStateService.create.mock.calls[0][0];
      expect(call.rollKey).toBeDefined();
      expect(typeof call.rollKey).toBe("string");
    });

    it("should insert the roll into the rolls table", async () => {
      await service.create(baseDto);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO rolls"),
        expect.any(Array),
      );
    });

    it("should default to ADDED state when none is provided", async () => {
      const roll = await service.create(baseDto);

      expect(roll.state).toBe(RollState.ADDED);
    });

    it("should apply expired auto-tag when expirationDate is before dateObtained", async () => {
      await service.create({
        ...baseDto,
        expirationDate: new Date("2023-01-01"),
        dateObtained: new Date("2024-01-01"),
      });

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        expect.any(String),
        "expired",
        true,
      );
    });

    it("should not apply expired auto-tag when expirationDate is after dateObtained", async () => {
      await service.create({
        ...baseDto,
        expirationDate: new Date("2025-01-01"),
        dateObtained: new Date("2024-01-01"),
      });

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        expect.any(String),
        "expired",
        false,
      );
    });

    it("should not apply expired auto-tag when no expirationDate is provided", async () => {
      await service.create(baseDto);

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        expect.any(String),
        "expired",
        false,
      );
    });
  });

  describe("transition", () => {
    const shelvedRollRow = {
      id: "roll-uuid",
      roll_id: "roll-00001",
      stock_key: "stock-1",
      state: RollState.SHELVED,
      images_url: null,
      date_obtained: new Date().toISOString(),
      obtainment_method: "Purchase",
      obtained_from: "B&H",
      expiration_date: null,
      times_exposed_to_xrays: 0,
      loaded_into: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    beforeEach(() => {
      db.query.mockResolvedValue([shelvedRollRow]);
    });

    it("should record the transition in roll_states", async () => {
      await service.transition("roll-uuid", { targetState: RollState.LOADED });

      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rollKey: "roll-uuid",
          state: RollState.LOADED,
        }),
      );
    });

    it("should reject invalid forward transitions", async () => {
      await expect(
        service.transition("roll-uuid", { targetState: RollState.FINISHED }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow valid backward transitions", async () => {
      await expect(
        service.transition("roll-uuid", { targetState: RollState.FROZEN }),
      ).resolves.not.toThrow();

      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({ state: RollState.FROZEN }),
      );
    });

    it("should pass notes to the state history entry", async () => {
      await service.transition("roll-uuid", {
        targetState: RollState.LOADED,
        notes: "loading into Leica M6",
      });

      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({ notes: "loading into Leica M6" }),
      );
    });

    it("should pass isErrorCorrection to the state history entry", async () => {
      await service.transition("roll-uuid", {
        targetState: RollState.FROZEN,
        isErrorCorrection: true,
      });

      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({ isErrorCorrection: true }),
      );
    });

    it("should pass isErrorCorrection: undefined when not set", async () => {
      await service.transition("roll-uuid", {
        targetState: RollState.LOADED,
      });

      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({ isErrorCorrection: undefined }),
      );
    });

    it("should pass metadata to the state history entry", async () => {
      await service.transition("roll-uuid", {
        targetState: RollState.LOADED,
        metadata: { temperature: -18 },
      });

      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { temperature: -18 } }),
      );
    });

    it("should pass metadata: undefined when not set", async () => {
      await service.transition("roll-uuid", {
        targetState: RollState.LOADED,
      });

      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: undefined }),
      );
    });
  });

  describe("transition to FINISHED", () => {
    const loadedRollRow = {
      id: "roll-uuid",
      roll_id: "roll-00001",
      stock_key: "stock-1",
      state: RollState.LOADED,
      images_url: null,
      date_obtained: new Date().toISOString(),
      obtainment_method: "Purchase",
      obtained_from: "B&H",
      expiration_date: null,
      times_exposed_to_xrays: 0,
      loaded_into: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("should apply pushed tag when shotISO > stock speed", async () => {
      db.query
        .mockResolvedValueOnce([loadedRollRow]) // findOne
        .mockResolvedValueOnce([{ speed: 400 }]) // syncPushPullTags stock query
        .mockResolvedValueOnce([loadedRollRow]); // update findOne

      await service.transition("roll-uuid", {
        targetState: RollState.FINISHED,
        metadata: { shotISO: 800 },
      });

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith("roll-uuid", "pushed", true);
      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith("roll-uuid", "pulled", false);
    });

    it("should apply pulled tag when shotISO < stock speed", async () => {
      db.query
        .mockResolvedValueOnce([loadedRollRow])
        .mockResolvedValueOnce([{ speed: 400 }])
        .mockResolvedValueOnce([loadedRollRow]);

      await service.transition("roll-uuid", {
        targetState: RollState.FINISHED,
        metadata: { shotISO: 200 },
      });

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith("roll-uuid", "pushed", false);
      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith("roll-uuid", "pulled", true);
    });

    it("should remove both tags when shotISO equals stock speed", async () => {
      db.query
        .mockResolvedValueOnce([loadedRollRow])
        .mockResolvedValueOnce([{ speed: 400 }])
        .mockResolvedValueOnce([loadedRollRow]);

      await service.transition("roll-uuid", {
        targetState: RollState.FINISHED,
        metadata: { shotISO: 400 },
      });

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith("roll-uuid", "pushed", false);
      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith("roll-uuid", "pulled", false);
    });

    it("should remove both tags when no shotISO provided", async () => {
      db.query
        .mockResolvedValueOnce([loadedRollRow])
        .mockResolvedValueOnce([{ speed: 400 }])
        .mockResolvedValueOnce([loadedRollRow]);

      await service.transition("roll-uuid", {
        targetState: RollState.FINISHED,
      });

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith("roll-uuid", "pushed", false);
      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith("roll-uuid", "pulled", false);
    });

    it("should not call syncPushPullTags for non-FINISHED transitions", async () => {
      db.query.mockResolvedValue([loadedRollRow]);

      await service.transition("roll-uuid", {
        targetState: RollState.FINISHED,
      });

      // Only pushed/pulled calls — expired is from update's syncExpiredTag
      const pushPullCalls = rollTagService.syncAutoTag.mock.calls.filter(
        ([, tag]) => tag === "pushed" || tag === "pulled",
      );
      expect(pushPullCalls.length).toBe(2);
    });
  });
});
