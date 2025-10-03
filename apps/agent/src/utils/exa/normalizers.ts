import { MAX_SNIPPET_LENGTH, MAX_TEXT_LENGTH } from "./constants.js";
import type { ExaSearchResult } from "./schemas.js";
import type {
  ExaSearchNormalizedHighlight,
  ExaSearchNormalizedResult,
} from "./types.js";

function truncateText(
  text: string | null | undefined
): string | null | undefined {
  if (!text || typeof text !== "string") {
    return text ?? null;
  }

  if (text.length <= MAX_TEXT_LENGTH) {
    return text;
  }

  return `${text.slice(0, MAX_TEXT_LENGTH)}... [truncated - original length: ${text.length} chars]`;
}

export function normalizeHighlight(
  highlight: string | { snippet?: string | null; source?: string | null }
): ExaSearchNormalizedHighlight {
  if (typeof highlight === "string") {
    return { snippet: highlight, source: null };
  }

  return {
    snippet: highlight.snippet ?? null,
    source: highlight.source ?? null,
  };
}

export function normalizeResults(
  results: ExaSearchResult[],
  includeText: boolean
): ExaSearchNormalizedResult[] {
  return results.map((result) => {
    const normalizedSubpages = result.subpages?.map((subpage) => ({
      title: subpage.title ?? undefined,
      url: subpage.url,
      highlights: (subpage.highlights ?? []).map(normalizeHighlight),
      summary: subpage.summary ?? undefined,
      fullText: includeText ? truncateText(subpage.text ?? null) : undefined,
    }));

    let snippet: string | null | undefined = result.text ?? null;
    if (typeof snippet === "string" && snippet.length > MAX_SNIPPET_LENGTH) {
      snippet = `${snippet.slice(0, MAX_SNIPPET_LENGTH)}...`;
    }

    return {
      title: result.title ?? undefined,
      url: result.url,
      author: result.author ?? undefined,
      publishedDate: result.publishedDate ?? undefined,
      highlights: (result.highlights ?? []).map(normalizeHighlight),
      summary: result.summary ?? undefined,
      fullText: includeText ? truncateText(result.text ?? null) : undefined,
      snippet,
      subpages: normalizedSubpages,
    };
  });
}
