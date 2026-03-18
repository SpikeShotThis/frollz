import { Test, TestingModule } from "@nestjs/testing";
import { TransitionService } from "./transition.service";
import { DatabaseService } from "../database/database.service";

const makeDbService = () => ({
  query: jest.fn().mockResolvedValue([]),
  execute: jest.fn().mockResolvedValue(undefined),
});

const FROZEN_EDGE = {
  id: "edge-1",
  from_state: "Added",
  to_state: "Frozen",
  transition_type: "FORWARD",
  requires_date: true,
  field: "temperature",
  field_type: "number",
  default_value: null,
  is_required: false,
};

const LOADED_EDGE = {
  id: "edge-2",
  from_state: "Shelved",
  to_state: "Loaded",
  transition_type: "FORWARD",
  requires_date: true,
  field: null,
  field_type: null,
  default_value: null,
  is_required: null,
};

describe("TransitionService", () => {
  let service: TransitionService;
  let db: ReturnType<typeof makeDbService>;

  beforeEach(async () => {
    db = makeDbService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransitionService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();

    service = module.get<TransitionService>(TransitionService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("getGraph", () => {
    it("should return all state names", async () => {
      db.query
        .mockResolvedValueOnce([{ name: "Added" }, { name: "Frozen" }])
        .mockResolvedValueOnce([]);

      const graph = await service.getGraph();
      expect(graph.states).toEqual(["Added", "Frozen"]);
    });

    it("should build transition edges from query rows", async () => {
      db.query
        .mockResolvedValueOnce([{ name: "Added" }, { name: "Frozen" }])
        .mockResolvedValueOnce([FROZEN_EDGE]);

      const graph = await service.getGraph();
      expect(graph.transitions).toHaveLength(1);
      expect(graph.transitions[0]).toMatchObject({
        id: "edge-1",
        fromState: "Added",
        toState: "Frozen",
        transitionType: "FORWARD",
        requiresDate: true,
      });
    });

    it("should aggregate multiple metadata fields under one edge", async () => {
      db.query
        .mockResolvedValueOnce([
          { name: "Finished" },
          { name: "Sent For Development" },
        ])
        .mockResolvedValueOnce([
          {
            id: "edge-3",
            from_state: "Finished",
            to_state: "Sent For Development",
            transition_type: "FORWARD",
            requires_date: false,
            field: "labName",
            field_type: "string",
            default_value: null,
            is_required: false,
          },
          {
            id: "edge-3",
            from_state: "Finished",
            to_state: "Sent For Development",
            transition_type: "FORWARD",
            requires_date: false,
            field: "processRequested",
            field_type: "string",
            default_value: null,
            is_required: false,
          },
        ]);

      const graph = await service.getGraph();
      expect(graph.transitions).toHaveLength(1);
      expect(graph.transitions[0].metadata).toHaveLength(2);
      expect(graph.transitions[0].metadata.map((m) => m.field)).toEqual([
        "labName",
        "processRequested",
      ]);
    });

    it("should return an empty metadata array for edges with no metadata fields", async () => {
      db.query
        .mockResolvedValueOnce([{ name: "Shelved" }, { name: "Loaded" }])
        .mockResolvedValueOnce([LOADED_EDGE]);

      const graph = await service.getGraph();
      expect(graph.transitions[0].metadata).toEqual([]);
    });
  });

  describe("isValidTransition", () => {
    it("should return true when the transition exists in the DB", async () => {
      db.query.mockResolvedValueOnce([{ id: "edge-1" }]);
      const result = await service.isValidTransition("Shelved", "Loaded");
      expect(result).toBe(true);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE fs.name = ? AND ts.name = ?"),
        ["Shelved", "Loaded"],
      );
    });

    it("should return false when no matching transition row exists", async () => {
      db.query.mockResolvedValueOnce([]);
      const result = await service.isValidTransition("Shelved", "Received");
      expect(result).toBe(false);
    });
  });
});
