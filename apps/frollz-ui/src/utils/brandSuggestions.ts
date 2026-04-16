/**
 * Converts a string to title case (first letter of each word capitalized,
 * remainder lowercased).
 */
export function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word) =>
      word.length > 0
        ? word[0].toUpperCase() + word.slice(1).toLowerCase()
        : word,
    )
    .join(" ");
}

/**
 * Builds the ordered list of brand suggestions for the typeahead dropdown:
 *  1. The query in title case
 *  2. The exact query (if different from title case)
 *  3. DB brands that match but aren't already in the list
 *
 * Returns an empty array when the query is blank.
 */
export function buildSuggestions(query: string, dbBrands: string[]): string[] {
  if (!query.trim()) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  const titleCased = toTitleCase(query);
  result.push(titleCased);
  seen.add(titleCased);

  if (!seen.has(query)) {
    result.push(query);
    seen.add(query);
  }

  for (const brand of dbBrands) {
    if (!seen.has(brand)) {
      result.push(brand);
      seen.add(brand);
    }
  }

  return result;
}
