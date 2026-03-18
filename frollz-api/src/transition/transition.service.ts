import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import {
  TransitionEdge,
  TransitionGraph,
  TransitionMetadataField,
} from "./entities/transition.entity";

interface TransitionRow {
  id: string;
  from_state: string;
  to_state: string;
  transition_type: string;
  requires_date: boolean;
  field: string | null;
  field_type: string | null;
  default_value: string | null;
  is_required: boolean | null;
}

@Injectable()
export class TransitionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getGraph(): Promise<TransitionGraph> {
    const [stateRows, transitionRows] = await Promise.all([
      this.databaseService.query<{ name: string }>(
        `SELECT name FROM transition_states ORDER BY name`,
      ),
      this.databaseService.query<TransitionRow>(`
        SELECT
          t.id,
          fs.name AS from_state,
          ts.name AS to_state,
          tt.name AS transition_type,
          t.requires_date,
          tm.field,
          tmft.name AS field_type,
          tm.default_value,
          tm.is_required
        FROM transitions t
        JOIN transition_states fs ON t.from_state_id = fs.id
        JOIN transition_states ts ON t.to_state_id = ts.id
        JOIN transition_types tt ON t.transition_type_id = tt.id
        LEFT JOIN transition_metadata tm ON tm.transition_id = t.id
        LEFT JOIN transition_metadata_field_types tmft ON tm.field_type_id = tmft.id
        ORDER BY t.id, tm.field
      `),
    ]);

    const states = stateRows.map((r) => r.name);

    const edgeMap = new Map<string, TransitionEdge>();
    for (const row of transitionRows) {
      if (!edgeMap.has(row.id)) {
        edgeMap.set(row.id, {
          id: row.id,
          fromState: row.from_state,
          toState: row.to_state,
          transitionType: row.transition_type,
          requiresDate: row.requires_date,
          metadata: [],
        });
      }
      if (row.field && row.field_type) {
        const metaField: TransitionMetadataField = {
          field: row.field,
          fieldType: row.field_type,
          defaultValue: row.default_value,
          isRequired: row.is_required ?? true,
        };
        edgeMap.get(row.id)!.metadata.push(metaField);
      }
    }

    return { states, transitions: Array.from(edgeMap.values()) };
  }

  async isValidTransition(
    fromState: string,
    toState: string,
  ): Promise<boolean> {
    const rows = await this.databaseService.query<{ id: string }>(
      `SELECT t.id
       FROM transitions t
       JOIN transition_states fs ON t.from_state_id = fs.id
       JOIN transition_states ts ON t.to_state_id = ts.id
       WHERE fs.name = ? AND ts.name = ?`,
      [fromState, toState],
    );
    return rows.length > 0;
  }
}
