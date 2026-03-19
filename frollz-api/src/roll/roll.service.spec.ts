import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { RollService } from "./roll.service";
import { DatabaseService } from "../database/database.service";
import { RollStateService } from "../roll-state/roll-state.service";
import { RollTagService } from "../roll-tag/roll-tag.service";
import { RollState } from "./entities/roll.entity";
import { TransitionService } from "../transition/transition.service";
import type { TransitionEdge } from "../transition/entities/transition.entity";

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

const makeEdge = (overrides: Partial<TransitionEdge> = {}): TransitionEdge => ({
  id: "edge-1",
  fromState: RollState.SHELVED,
  toState: RollState.LOADED,
  transitionType: "FORWARD",
  requiresDate: true,
  metadata: [],
  ...overrides,
});

const makeTransitionService = () => ({
  getTransitionEdge: jest.fn().mockResolvedValue(makeEdge()),
});

describe("RollService", () => {
  let service: RollService;
  let db: ReturnType<typeof makeDbService>;
  let rollStateService: ReturnType<typeof makeRollStateService>;
  let rollTagService: ReturnType<typeof makeRollTagService>;
  let transitionService: ReturnType<typeof makeTransitionService>;

  beforeEach(async () => {
    db = makeDbService();
    rollStateService = makeRollStateService();
    rollTagService = makeRollTagService();
    transitionService = makeTransitionService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RollService,
        { provide: DatabaseService, useValue: db },
        { provide: RollStateService, useValue: rollStateService },
        { provide: RollTagService, useValue: rollTagService },
        { provide: TransitionService, useValue: transitionService },
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
      transition_profile: "standard",
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

    it("should reject invalid transitions when TransitionService returns null", async () => {
      transitionService.getTransitionEdge.mockResolvedValueOnce(null);
      await expect(
        service.transition("roll-uuid", { targetState: RollState.FINISHED }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow valid backward transitions", async () => {
      transitionService.getTransitionEdge.mockResolvedValueOnce(
        makeEdge({ fromState: RollState.SHELVED, toState: RollState.FROZEN }),
      );
      await expect(
        service.transition("roll-uuid", { targetState: RollState.FROZEN }),
      ).resolves.not.toThrow();

      expect(transitionService.getTransitionEdge).toHaveBeenCalledWith(
        RollState.SHELVED,
        RollState.FROZEN,
        "standard",
      );
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

    it("should pass validated metadata to the state history entry", async () => {
      transitionService.getTransitionEdge.mockResolvedValueOnce(
        makeEdge({
          metadata: [
            {
              field: "temperature",
              fieldType: "number",
              defaultValue: null,
              isRequired: false,
            },
          ],
        }),
      );
      await service.transition("roll-uuid", {
        targetState: RollState.LOADED,
        metadata: { temperature: -18 },
      });

      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { temperature: -18 } }),
      );
    });

    it("should strip unknown metadata keys not defined on the edge", async () => {
      transitionService.getTransitionEdge.mockResolvedValueOnce(
        makeEdge({
          metadata: [
            {
              field: "temperature",
              fieldType: "number",
              defaultValue: null,
              isRequired: false,
            },
          ],
        }),
      );
      await service.transition("roll-uuid", {
        targetState: RollState.LOADED,
        metadata: { temperature: -18, __proto__: "evil", unknownKey: "bad" },
      });

      expect(rollStateService.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { temperature: -18 } }),
      );
    });

    it("should throw when a metadata value is not a primitive", async () => {
      transitionService.getTransitionEdge.mockResolvedValueOnce(
        makeEdge({
          metadata: [
            {
              field: "temperature",
              fieldType: "number",
              defaultValue: null,
              isRequired: false,
            },
          ],
        }),
      );
      await expect(
        service.transition("roll-uuid", {
          targetState: RollState.LOADED,
          metadata: { temperature: { nested: "object" } },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw when a required metadata field is missing", async () => {
      transitionService.getTransitionEdge.mockResolvedValueOnce(
        makeEdge({
          metadata: [
            {
              field: "processRequested",
              fieldType: "string",
              defaultValue: null,
              isRequired: true,
            },
          ],
        }),
      );
      await expect(
        service.transition("roll-uuid", {
          targetState: RollState.LOADED,
          metadata: {},
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should pass metadata: undefined when edge has no metadata fields", async () => {
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
      transition_profile: "standard",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sentForDevEdge = makeEdge({
      fromState: RollState.FINISHED,
      toState: RollState.SENT_FOR_DEVELOPMENT,
      metadata: [
        {
          field: "labName",
          fieldType: "string",
          defaultValue: null,
          isRequired: false,
        },
        {
          field: "deliveryMethod",
          fieldType: "string",
          defaultValue: null,
          isRequired: false,
        },
        {
          field: "processRequested",
          fieldType: "string",
          defaultValue: null,
          isRequired: false,
        },
        {
          field: "pushPullStops",
          fieldType: "number",
          defaultValue: null,
          isRequired: false,
        },
      ],
    });

    it("should apply cross-processed tag when processRequested differs from stock process", async () => {
      transitionService.getTransitionEdge.mockResolvedValueOnce(sentForDevEdge);
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
      transitionService.getTransitionEdge.mockResolvedValueOnce(sentForDevEdge);
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
      transitionService.getTransitionEdge.mockResolvedValueOnce(sentForDevEdge);
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
      transition_profile: "standard",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const finishedEdge = makeEdge({
      fromState: RollState.LOADED,
      toState: RollState.FINISHED,
      metadata: [
        {
          field: "shotISO",
          fieldType: "number",
          defaultValue: null,
          isRequired: false,
        },
      ],
    });

    it("should apply pushed tag when shotISO > stock speed", async () => {
      transitionService.getTransitionEdge.mockResolvedValueOnce(finishedEdge);
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
      transitionService.getTransitionEdge.mockResolvedValueOnce(finishedEdge);
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
      transitionService.getTransitionEdge.mockResolvedValueOnce(finishedEdge);
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
      transitionService.getTransitionEdge.mockResolvedValueOnce(finishedEdge);
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
      transitionService.getTransitionEdge.mockResolvedValueOnce(finishedEdge);
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

  describe("getNextId", () => {
    it("should return a zero-padded ID from the sequence", async () => {
      db.query.mockResolvedValueOnce([{ nextval: "7" }]);
      const result = await service.getNextId();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("nextval('roll_id_seq')"),
      );
      expect(result).toBe("00007");
    });

    it("should not pad IDs longer than 5 digits", async () => {
      db.query.mockResolvedValueOnce([{ nextval: "100000" }]);
      const result = await service.getNextId();

      expect(result).toBe("100000");
    });
  });

  describe("create — transition profile", () => {
    const profileDto = {
      stockKey: "stock-1",
      rollId: "roll-00001",
      state: RollState.ADDED,
      obtainmentMethod: "Purchase" as any,
      obtainedFrom: "B&H",
      timesExposedToXrays: 0,
    };

    it("should assign 'instant' profile when stock process is Instant", async () => {
      db.query.mockResolvedValueOnce([{ process: "Instant" }]);

      await service.create({ ...profileDto });

      const [, values] = db.execute.mock.calls.find(([sql]: [string]) =>
        sql.includes("INSERT INTO rolls"),
      )!;
      expect(values).toContain("instant");
    });

    it("should assign 'standard' profile for non-instant processes", async () => {
      db.query.mockResolvedValueOnce([{ process: "C-41" }]);

      await service.create({ ...profileDto });

      const [, values] = db.execute.mock.calls.find(([sql]: [string]) =>
        sql.includes("INSERT INTO rolls"),
      )!;
      expect(values).toContain("standard");
    });

    it("should assign 'standard' profile when stock is not found", async () => {
      // default mock returns [] — stock not found

      await service.create({ ...profileDto });

      const [, values] = db.execute.mock.calls.find(([sql]: [string]) =>
        sql.includes("INSERT INTO rolls"),
      )!;
      expect(values).toContain("standard");
    });
  });

  describe("create — bulk roll", () => {
    const bulkDto = {
      stockKey: "stock-1",
      rollId: "roll-00001",
      state: RollState.ADDED,
      obtainmentMethod: "Purchase" as any,
      obtainedFrom: "B&H",
      timesExposedToXrays: 0,
      isBulkRoll: true,
    };

    it("should assign 'bulk' profile when isBulkRoll is true", async () => {
      await service.create(bulkDto);

      const [, values] = db.execute.mock.calls.find(([sql]: [string]) =>
        sql.includes("INSERT INTO rolls"),
      )!;
      expect(values).toContain("bulk");
    });

    it("should throw when neither stockKey nor parentRollId is provided", async () => {
      await expect(
        service.create({
          rollId: "roll-00001",
          obtainmentMethod: "Purchase" as any,
          obtainedFrom: "B&H",
          timesExposedToXrays: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("create — child roll from bulk parent", () => {
    const childDto = {
      rollId: "roll-00002",
      parentRollId: "parent-uuid",
      state: RollState.ADDED,
      obtainmentMethod: "Purchase" as any,
      obtainedFrom: "B&H",
      timesExposedToXrays: 0,
    };

    const bulkParentRow = {
      stock_key: "stock-1",
      transition_profile: "bulk",
      stock_process: "C-41",
    };

    it("should inherit stockKey from parent and assign 'standard' profile for C-41 stock", async () => {
      db.query.mockResolvedValueOnce([bulkParentRow]);

      const roll = await service.create(childDto);

      expect(roll.stockKey).toBe("stock-1");
      expect(roll.transitionProfile).toBe("standard");
    });

    it("should assign 'instant' profile when parent stock process is Instant", async () => {
      db.query.mockResolvedValueOnce([
        { ...bulkParentRow, stock_process: "Instant" },
      ]);

      const roll = await service.create(childDto);

      expect(roll.transitionProfile).toBe("instant");
    });

    it("should store the parentRollId on the created roll", async () => {
      db.query.mockResolvedValueOnce([bulkParentRow]);

      const roll = await service.create(childDto);

      expect(roll.parentRollId).toBe("parent-uuid");
    });

    it("should include parent_roll_id in the INSERT", async () => {
      db.query.mockResolvedValueOnce([bulkParentRow]);

      await service.create(childDto);

      const [sql, values] = db.execute.mock.calls.find(([s]: [string]) =>
        s.includes("INSERT INTO rolls"),
      )!;
      expect(sql).toContain("parent_roll_id");
      expect(values).toContain("parent-uuid");
    });

    it("should throw when the parent roll does not exist", async () => {
      db.query.mockResolvedValueOnce([]);

      await expect(service.create(childDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw when the parent roll is not a bulk roll", async () => {
      db.query.mockResolvedValueOnce([
        { ...bulkParentRow, transition_profile: "standard" },
      ]);

      await expect(service.create(childDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("update — child roll stock lock", () => {
    const childRollRow = {
      id: "child-uuid",
      roll_id: "roll-00002",
      stock_key: "stock-1",
      state: RollState.ADDED,
      images_url: null,
      date_obtained: new Date().toISOString(),
      obtainment_method: "Purchase",
      obtained_from: "B&H",
      expiration_date: null,
      times_exposed_to_xrays: 0,
      loaded_into: null,
      transition_profile: "standard",
      parent_roll_id: "parent-uuid",
      child_roll_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("should throw when attempting to change stockKey on a child roll", async () => {
      db.query.mockResolvedValueOnce([childRollRow]);

      await expect(
        service.update("child-uuid", { stockKey: "stock-2" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow other field updates on a child roll", async () => {
      db.query
        .mockResolvedValueOnce([childRollRow]) // findOne for child check
        .mockResolvedValueOnce([childRollRow]); // findOne after update

      await expect(
        service.update("child-uuid", { obtainedFrom: "Film Supply Co." }),
      ).resolves.not.toThrow();
    });
  });

  describe("findChildren", () => {
    it("should query for rolls with matching parent_roll_id", async () => {
      db.query.mockResolvedValueOnce([]);

      await service.findChildren("bulk-uuid");

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("parent_roll_id"),
        ["bulk-uuid"],
      );
    });

    it("should return mapped rolls", async () => {
      const childRow = {
        id: "child-uuid",
        roll_id: "roll-00002",
        stock_key: "stock-1",
        state: RollState.ADDED,
        images_url: null,
        date_obtained: new Date().toISOString(),
        obtainment_method: "Purchase",
        obtained_from: "B&H",
        expiration_date: null,
        times_exposed_to_xrays: 0,
        loaded_into: null,
        transition_profile: "standard",
        parent_roll_id: "bulk-uuid",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.query.mockResolvedValueOnce([childRow]);

      const children = await service.findChildren("bulk-uuid");

      expect(children).toHaveLength(1);
      expect(children[0]._key).toBe("child-uuid");
      expect(children[0].parentRollId).toBe("bulk-uuid");
    });
  });

  describe("create — auto roll ID", () => {
    it("should use the sequence when no rollId is provided", async () => {
      db.query
        .mockResolvedValueOnce([{ nextval: "42" }]) // sequence query (runs before stock query)
        .mockResolvedValueOnce([]); // stock process query

      const dto = {
        stockKey: "stock-1",
        obtainmentMethod: "Purchase" as any,
        obtainedFrom: "B&H",
        timesExposedToXrays: 0,
      };

      const roll = await service.create(dto);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("nextval('roll_id_seq')"),
      );
      expect(roll.rollId).toBe("00042");
    });

    it("should use the provided rollId and not call the sequence", async () => {
      const dto = {
        stockKey: "stock-1",
        rollId: "my-custom-id",
        obtainmentMethod: "Purchase" as any,
        obtainedFrom: "B&H",
        timesExposedToXrays: 0,
      };

      const roll = await service.create(dto);

      const sequenceCalls = db.query.mock.calls.filter(([sql]: [string]) =>
        sql.includes("nextval"),
      );
      expect(sequenceCalls).toHaveLength(0);
      expect(roll.rollId).toBe("my-custom-id");
    });
  });
});
