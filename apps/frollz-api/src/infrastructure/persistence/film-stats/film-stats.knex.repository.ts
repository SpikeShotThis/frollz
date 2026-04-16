import { Injectable } from "@nestjs/common";
import {
  EmulsionCount,
  IFilmStatsRepository,
  MonthCount,
  StateCount,
  TransitionDuration,
} from "../../../domain/film-stats/repositories/film-stats.repository.interface";
import { BaseKnexRepository } from "../base.knex.repository";

@Injectable()
export class FilmStatsKnexRepository
  extends BaseKnexRepository
  implements IFilmStatsRepository
{
  async countByCurrentState(): Promise<StateCount[]> {
    const rows = await this.db("transition_state as ts")
      .leftJoin(
        this.db("film_state as fs")
          .select("fs.film_id", "fs.state_id")
          .whereRaw(
            "fs.id = (SELECT MAX(id) FROM film_state fs2 WHERE fs2.film_id = fs.film_id)",
          )
          .as("sub"),
        "sub.state_id",
        "ts.id",
      )
      .groupBy("ts.id", "ts.name")
      .orderBy("ts.name")
      .select("ts.name as state", this.db.raw("COUNT(sub.film_id) as count"));

    return rows.map((r: { state: string; count: string | number }) => ({
      state: r.state,
      count: Number(r.count),
    }));
  }

  async countByFirstStateMonth(months: number): Promise<MonthCount[]> {
    const isPostgres = this.isPostgres();
    const monthExpr = isPostgres
      ? `to_char(first_date, 'YYYY-MM')`
      : `strftime('%Y-%m', first_date)`;
    const safeMonths = Math.floor(Math.abs(months));
    const cutoff = isPostgres
      ? this.db.raw(`NOW() - (? * INTERVAL '1 month')`, [safeMonths])
      : this.db.raw(`datetime('now', ? || ' months')`, [`-${safeMonths}`]);

    const rows = await this.db
      .from(
        this.db("film_state")
          .select("film_id")
          .min("date as first_date")
          .groupBy("film_id")
          .as("first_states"),
      )
      .where("first_date", ">=", cutoff)
      .groupByRaw(monthExpr)
      .orderBy("month")
      .select(
        this.db.raw(`${monthExpr} as month`),
        this.db.raw("COUNT(*) as count"),
      );

    return rows.map((r: { month: string; count: string | number }) => ({
      month: r.month,
      count: Number(r.count),
    }));
  }

  async countByEmulsion(): Promise<EmulsionCount[]> {
    const rows = await this.db("film as f")
      .join("emulsion as e", "e.id", "f.emulsion_id")
      .groupBy("e.id", "e.brand")
      .orderByRaw("COUNT(f.id) DESC")
      .select(
        this.db.raw(`e.brand as emulsion_name`),
        this.db.raw("COUNT(f.id) as count"),
      );

    return rows.map((r: { emulsion_name: string; count: string | number }) => ({
      emulsionName: r.emulsion_name,
      count: Number(r.count),
    }));
  }

  async avgTransitionDurations(): Promise<TransitionDuration[]> {
    const dayDiff = this.isPostgres()
      ? `EXTRACT(EPOCH FROM (CAST(fs2.date AS TIMESTAMP) - CAST(fs1.date AS TIMESTAMP))) / 86400`
      : `(julianday(fs2.date) - julianday(fs1.date))`;

    const raw = await this.db.raw<{
      rows?: RawDurationRow[];
      [0]: RawDurationRow[];
    }>(`
      SELECT
        ts1.name || ' → ' || ts2.name AS transition,
        CASE WHEN COUNT(*) >= 2 THEN AVG(day_diff) ELSE NULL END AS avg_days
      FROM (
        SELECT
          fs1.state_id AS from_state_id,
          fs2.state_id AS to_state_id,
          ${dayDiff} AS day_diff
        FROM film_state fs1
        JOIN film_state fs2
          ON fs2.film_id = fs1.film_id
          AND fs2.id = (
            SELECT MIN(id) FROM film_state
            WHERE film_id = fs1.film_id AND id > fs1.id
          )
      ) pairs
      JOIN transition_state ts1 ON ts1.id = pairs.from_state_id
      JOIN transition_state ts2 ON ts2.id = pairs.to_state_id
      GROUP BY pairs.from_state_id, pairs.to_state_id, ts1.name, ts2.name
      ORDER BY ts1.name, ts2.name
    `);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: RawDurationRow[] = this.isPostgres() ? raw.rows : (raw as any);
    return rows.map((r) => ({
      transition: r.transition,
      avgDays:
        r.avg_days !== null && r.avg_days !== undefined
          ? Number(r.avg_days)
          : null,
    }));
  }

  private isPostgres(): boolean {
    return this.db.client?.config?.client === "pg";
  }
}

interface RawDurationRow {
  transition: string;
  avg_days: number | null;
}
