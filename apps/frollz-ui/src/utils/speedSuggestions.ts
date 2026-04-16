/**
 * Builds the ordered list of speed suggestions for the typeahead dropdown:
 *  1. The typed numeric value
 *  2. DB speeds that match but aren't already in the list
 *
 * Returns an empty array when the query is blank or non-numeric.
 */
export function buildSpeedSuggestions(
  query: string,
  dbSpeeds: number[],
): number[] {
  if (!query.trim() || !/^\d+$/.test(query.trim())) return [];

  const typedNumber = Number(query.trim());
  const seen = new Set<number>();
  const result: number[] = [];

  result.push(typedNumber);
  seen.add(typedNumber);

  for (const speed of dbSpeeds) {
    if (!seen.has(speed)) {
      result.push(speed);
      seen.add(speed);
    }
  }

  return result;
}
