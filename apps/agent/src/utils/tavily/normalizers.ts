import { SNIPPET_LENGTH_LIMIT } from "./constants.js";
import type { TavilySearchResult } from "./schemas.js";

export function normalizeResults(
  results: TavilySearchResult[],
  includeRawContent: boolean
): TavilySearchResult[] {
  return results.map((result) => {
    const normalized: Record<string, unknown> = { ...result };

    if (!includeRawContent) {
      normalized.rawContent = undefined;
    }

    if (
      !normalized.snippet &&
      typeof normalized.content === "string"
    ) {
      const content = normalized.content as string;
      normalized.snippet =
        content.length > SNIPPET_LENGTH_LIMIT
          ? `${content.slice(0, SNIPPET_LENGTH_LIMIT)}...`
          : content;
    }

    return normalized as TavilySearchResult;
  });
}
