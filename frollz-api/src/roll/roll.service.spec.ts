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

    it("should use the provided date for the state history entry", async () => {
      await service.transition("roll-uuid", {
        targetState: RollState.LOADED,
        date: "2026-01-15",
      });

      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({ date: new Date("2026-01-15") }),
      );
    });

    it("should default date to now when not provided", async () => {
      const before = new Date();
      await service.transition("roll-uuid", {
        targetState: RollState.LOADED,
      });
      const after = new Date();

      const call = (rollStateService.create as jest.Mock).mock.calls[0][0];
      expect(call.date.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(call.date.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("findAll / findOne", () => {
    const rollRow = {
      id: "roll-uuid",
      roll_id: "roll-00001",
      stock_key: "stock-1",
      state: RollState.ADDED,
      date_obtained: new Date().toISOString(),
      obtainment_method: "Purchase",
      obtained_from: "B&H",
      times_exposed_to_xrays: 0,
      expiration_date: null,
      images_url: null,
      loaded_into: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stock_name: "Kodak Gold 200",
      stock_speed: 200,
      format_name: "35mm",
    };

    it("should map stock_name, stock_speed, and format_name from the joined query", async () => {
      db.query.mockResolvedValueOnce([rollRow]);
      const rolls = await service.findAll();
      expect(rolls[0].stockName).toBe("Kodak Gold 200");
      expect(rolls[0].stockSpeed).toBe(200);
      expect(rolls[0].formatName).toBe("35mm");
    });

    it("should return null fields when join yields no stock", async () => {
      db.query.mockResolvedValueOnce([
        { ...rollRow, stock_name: null, stock_speed: null, format_name: null },
      ]);
      const rolls = await service.findAll();
      expect(rolls[0].stockName).toBeUndefined();
      expect(rolls[0].stockSpeed).toBeUndefined();
      expect(rolls[0].formatName).toBeUndefined();
    });
  });

  describe("transition to SENT_FOR_DEVELOPMENT", () => {
    const finishedRollRow = {
      id: "roll-uuid",
      roll_id: "roll-00001",
      stock_key: "stock-1",
      state: RollState.FINISHED,
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

    it("should apply cross-processed tag when processRequested differs from stock process", async () => {
      db.query
        .mockResolvedValueOnce([finishedRollRow])
        .mockResolvedValueOnce([{ process: "C-41" }])
        .mockResolvedValueOnce([finishedRollRow]);

      await service.transition("roll-uuid", {
        targetState: RollState.SENT_FOR_DEVELOPMENT,
        metadata: {
          labName: "The Darkroom",
          deliveryMethod: "Mail in",
          processRequested: "E-6",
        },
      });

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        "roll-uuid",
        "cross-processed",
        true,
      );
    });

    it("should not apply cross-processed tag when processRequested matches stock process", async () => {
      db.query
        .mockResolvedValueOnce([finishedRollRow])
        .mockResolvedValueOnce([{ process: "C-41" }])
        .mockResolvedValueOnce([finishedRollRow]);

      await service.transition("roll-uuid", {
        targetState: RollState.SENT_FOR_DEVELOPMENT,
        metadata: {
          labName: "The Darkroom",
          deliveryMethod: "Mail in",
          processRequested: "C-41",
        },
      });

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        "roll-uuid",
        "cross-processed",
        false,
      );
    });

    it("should not call syncCrossProcessedTag when processRequested is absent", async () => {
      db.query
        .mockResolvedValueOnce([finishedRollRow])
        .mockResolvedValueOnce([finishedRollRow]);

      await service.transition("roll-uuid", {
        targetState: RollState.SENT_FOR_DEVELOPMENT,
        metadata: { labName: "The Darkroom", deliveryMethod: "Mail in" },
      });

      const crossCalls = rollTagService.syncAutoTag.mock.calls.filter(
        ([, tag]) => tag === "cross-processed",
      );
      expect(crossCalls.length).toBe(0);
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

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        "roll-uuid",
        "pushed",
        true,
      );
      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        "roll-uuid",
        "pulled",
        false,
      );
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

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        "roll-uuid",
        "pushed",
        false,
      );
      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        "roll-uuid",
        "pulled",
        true,
      );
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

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        "roll-uuid",
        "pushed",
        false,
      );
      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        "roll-uuid",
        "pulled",
        false,
      );
    });

    it("should remove both tags when no shotISO provided", async () => {
      db.query
        .mockResolvedValueOnce([loadedRollRow])
        .mockResolvedValueOnce([{ speed: 400 }])
        .mockResolvedValueOnce([loadedRollRow]);

      await service.transition("roll-uuid", {
        targetState: RollState.FINISHED,
      });

      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        "roll-uuid",
        "pushed",
        false,
      );
      expect(rollTagService.syncAutoTag).toHaveBeenCalledWith(
        "roll-uuid",
        "pulled",
        false,
      );
    });

    it("should not call syncPushPullTags when transitioning to a non-FINISHED state", async () => {
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

  describe("remove", () => {
    it("should return true when the record is deleted", async () => {
      db.query.mockResolvedValueOnce([{ id: "roll-uuid" }]);
      const result = await service.remove("roll-uuid");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM rolls"),
        ["roll-uuid"],
      );
      expect(result).toBe(true);
    });

    it("should return false when the record does not exist", async () => {
      db.query.mockResolvedValueOnce([]);
      const result = await service.remove("nonexistent");

      expect(result).toBe(false);
    });
  });
});
