import { describe, it, expect } from "vitest";
import { buildSpeedSuggestions } from "../speedSuggestions";

describe("buildSpeedSuggestions", () => {
  it("returns an empty array when the query is empty", () => {
    expect(buildSpeedSuggestions("", [])).toEqual([]);
  });

  it("returns an empty array when the query is only whitespace", () => {
    expect(buildSpeedSuggestions("   ", [])).toEqual([]);
  });

  it("returns an empty array when the query is non-numeric", () => {
    expect(buildSpeedSuggestions("abc", [])).toEqual([]);
  });

  it("places the typed numeric value first", () => {
    const result = buildSpeedSuggestions("40", []);
    expect(result[0]).toBe(40);
  });

  it("appends DB speeds after the typed value", () => {
    const result = buildSpeedSuggestions("4", [400, 800]);
    expect(result).toContain(400);
    expect(result).toContain(800);
    expect(result.indexOf(4)).toBeLessThan(result.indexOf(400));
  });

  it("does not duplicate a DB speed that matches the typed value", () => {
    const result = buildSpeedSuggestions("400", [400, 800]);
    expect(result.filter((s) => s === 400)).toHaveLength(1);
  });

  it("includes all non-duplicate DB speeds", () => {
    const result = buildSpeedSuggestions("4", [400, 800, 1600]);
    expect(result).toContain(400);
    expect(result).toContain(800);
    expect(result).toContain(1600);
  });

  it("handles a query with leading/trailing whitespace", () => {
    const result = buildSpeedSuggestions(" 400 ", []);
    expect(result[0]).toBe(400);
  });
});
