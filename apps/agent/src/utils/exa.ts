/** biome-ignore-all lint/correctness/noUnusedVariables: <> */
import Exa from "exa-js";
import { z } from "zod";
import {
  formatErrorForUser,
  RateLimitError,
  SearchTimeoutError,
  ToolExecutionError,
  withRetry,
} from "./errors.js";

export const EXA_CATEGORIES = [
  "company",
  "research paper",
  "news",
  "github",
  "tweet",
  "movie",
  "song",
  "personal site",
  "pdf",
] as const;

export const EXA_SEARCH_TYPES = ["auto", "neural", "keyword"] as const;
export const EXA_LIVECRAWL_MODES = ["always", "never", "asAvailable"] as const;

// Constants for magic numbers
const MAX_RESULTS = 100;
const DEFAULT_HIGHLIGHT_SENTENCES = 4;
const MAX_SUBPAGES = 8;
const MAX_SNIPPET_LENGTH = 500;
const MAX_TEXT_LENGTH = 10_000; // Maximum characters for full text to prevent state overflow
const DEFAULT_TIMEOUT_MS = 30_000;

export const exaSearchArgsSchema = z.object({
  query: z.string().describe("The search query"),
  numResults: z
    .number()
    .int()
    .min(1)
    .max(MAX_RESULTS)
    .optional()
    .default(10)
    .describe("Number of results to return"),
  type: z
    .enum(EXA_SEARCH_TYPES)
    .optional()
    .default("auto")
    .describe("Search strategy"),
  includeText: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to include full text content (disabled by default to prevent state overflow)"),
  includeHighlights: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to request highlighted excerpts"),
  highlightQuery: z
    .string()
    .optional()
    .describe("Custom query for highlight generation"),
  numHighlightSentences: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(DEFAULT_HIGHLIGHT_SENTENCES)
    .describe("Number of sentences per highlight"),
  summaryQuery: z
    .string()
    .optional()
    .describe("Prompt for AI-generated summaries"),
  subpages: z
    .number()
    .int()
    .min(0)
    .max(MAX_SUBPAGES)
    .optional()
    .default(0)
    .describe("Number of subpages to fetch for each result"),
  subpageTargets: z
    .array(z.string())
    .optional()
    .describe("Preferred subpage keywords or sections"),
  livecrawl: z
    .enum(EXA_LIVECRAWL_MODES)
    .optional()
    .default("always")
    .describe("Whether to live crawl pages"),
  category: z
    .enum(EXA_CATEGORIES)
    .optional()
    .describe("Content category filter"),
  startCrawlDate: z
    .string()
    .optional()
    .describe("Start date for crawled content (YYYY-MM-DD)"),
  endCrawlDate: z
    .string()
    .optional()
    .describe("End date for crawled content (YYYY-MM-DD)"),
});

// Exa API sometimes returns highlights as strings instead of objects
// Handle both formats to prevent schema validation errors
const exaHighlightSchema = z.union([
  z.string(), // Simple string highlight
  z
    .object({
      snippet: z.string().optional().nullable(),
      source: z.string().optional().nullable(),
    })
    .passthrough(), // Structured highlight object
]);

const exaSubpageSchema = z
  .object({
    title: z.string().optional().nullable(),
    url: z.string(),
    summary: z.string().optional().nullable(),
    text: z.string().optional().nullable(),
    highlights: z.array(exaHighlightSchema).optional().nullable(),
  })
  .passthrough();

const exaResultSchema = z
  .object({
    title: z.string().optional().nullable(),
    url: z.string(),
    author: z.string().optional().nullable(),
    publishedDate: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    text: z.string().optional().nullable(),
    highlights: z.array(exaHighlightSchema).optional().nullable(),
    subpages: z.array(exaSubpageSchema).optional().nullable(),
  })
  .passthrough();

const exaSearchResponseSchema = z
  .object({
    results: z.array(exaResultSchema).default([]),
  })
  .passthrough();

export type ExaSearchArgs = z.input<typeof exaSearchArgsSchema>;
export type ExaSearchParsedArgs = z.infer<typeof exaSearchArgsSchema>;
export type ExaSearchResponse = z.infer<typeof exaSearchResponseSchema>;
export type ExaSearchResult = ExaSearchResponse["results"][number];
export type ExaSearchSubpage = NonNullable<ExaSearchResult["subpages"]>[number];

export type ExaSearchNormalizedHighlight = {
  snippet?: string | null;
  source?: string | null;
};

export type ExaSearchNormalizedSubpage = {
  title?: string | null;
  url: string;
  highlights: ExaSearchNormalizedHighlight[];
  summary?: string | null;
  fullText?: string | null;
};

export type ExaSearchNormalizedResult = {
  title?: string | null;
  url: string;
  author?: string | null;
  publishedDate?: string | null;
  highlights: ExaSearchNormalizedHighlight[];
  summary?: string | null;
  fullText?: string | null;
  snippet?: string | null;
  subpages?: ExaSearchNormalizedSubpage[];
};

export type ExaSearchToolSuccess = {
  query: string;
  results: ExaSearchNormalizedResult[];
  message: string;
  error?: undefined;
};

export type ExaSearchToolError = {
  query: string;
  results: ExaSearchNormalizedResult[];
  message: string;
  error: string;
};

export type ExaSearchToolResult = ExaSearchToolSuccess | ExaSearchToolError;

export type PerformExaSearchOptions = {
  toolName?: string;
  timeoutMs?: number;
};

function buildSearchOptions(
  args: ExaSearchParsedArgs
): Record<string, unknown> {
  const contents: Record<string, unknown> = {};

  if (args.includeText) {
    contents.text = true;
  }

  if (args.includeHighlights) {
    contents.highlights = {
      query: args.highlightQuery ?? args.query,
      numSentences: args.numHighlightSentences,
    };
  }

  if (args.summaryQuery) {
    contents.summary = { query: args.summaryQuery };
  }

  const searchOptions: Record<string, unknown> = {
    numResults: args.numResults,
    type: args.type,
    livecrawl: args.livecrawl,
  };

  if (Object.keys(contents).length > 0) {
    searchOptions.contents = contents;
  }

  if (typeof args.subpages === "number" && args.subpages > 0) {
    searchOptions.subpages = args.subpages;
    if (args.subpageTargets?.length) {
      searchOptions.subpageTargets = args.subpageTargets;
    }
  }

  if (args.category) {
    searchOptions.category = args.category;
  }

  if (args.startCrawlDate) {
    searchOptions.startCrawlDate = args.startCrawlDate;
  }

  if (args.endCrawlDate) {
    searchOptions.endCrawlDate = args.endCrawlDate;
  }

  return Object.fromEntries(
    Object.entries(searchOptions).filter(([, value]) => value !== undefined)
  );
}

/**
 * Normalize highlight - handle both string and object formats from Exa API
 */
function normalizeHighlight(
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

function normalizeResults(
  results: ExaSearchResult[],
  includeText: boolean
): ExaSearchNormalizedResult[] {
  return results.map((result) => {
    // Helper to truncate text if needed
    const truncateText = (text: string | null | undefined): string | null | undefined => {
      if (!text || typeof text !== "string") return text;
      if (text.length <= MAX_TEXT_LENGTH) return text;
      return `${text.slice(0, MAX_TEXT_LENGTH)}... [truncated - original length: ${text.length} chars]`;
    };

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

function classifyError(
  error: Error,
  query: string,
  timeoutMs: number,
  toolName: string
): Error {
  const message = error.message.toLowerCase();

  if (message.includes("timeout") || message.includes("timed out")) {
    return new SearchTimeoutError(query, timeoutMs, { toolName });
  }

  if (message.includes("429") || message.includes("rate limit")) {
    return new RateLimitError("Exa", undefined, { toolName, query });
  }

  return new ToolExecutionError(toolName, error.message, error, { query });
}

export async function performExaSearch(
  rawArgs: ExaSearchArgs,
  options: PerformExaSearchOptions = {}
): Promise<ExaSearchToolResult> {
  const toolName = options.toolName ?? "exa_search";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const args = exaSearchArgsSchema.parse(rawArgs);
  const { query } = args;

  // Log search initiation for diagnostics
  console.log(`[Exa Search] Initiating search for query: "${query}"`);

  if (!process.env.EXA_API_KEY) {
    const errorMsg =
      "EXA_API_KEY is not configured. Exa search is unavailable.";
    console.error("[Exa Search] CONFIGURATION ERROR: EXA_API_KEY not found in environment");
    return {
      error: errorMsg,
      query,
      results: [],
      message:
        "Exa search tool is unavailable. Please continue with other available information.",
    };
  }

  try {
    const exaApiKey = process.env.EXA_API_KEY;
    const exa = new Exa(exaApiKey);
    const searchOptions = buildSearchOptions(args);

    console.log(`[Exa Search] Search options:`, JSON.stringify(searchOptions, null, 2));

    const rawResult = await withRetry(
      () => exa.searchAndContents(query, searchOptions),
      { timeoutMs }
    );

    const parsed = exaSearchResponseSchema.parse(rawResult);
    const normalizedResults = normalizeResults(
      parsed.results,
      args.includeText
    );

    console.log(`[Exa Search] SUCCESS: Found ${normalizedResults.length} results for query: "${query}"`);

    return {
      query,
      results: normalizedResults,
      message: `Found ${normalizedResults.length} results for: ${query}`,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    const classified = classifyError(err, query, timeoutMs, toolName);
    const userMessage = formatErrorForUser(classified);

    // Enhanced error logging for diagnostics
    console.error(`[Exa Search] FAILED for query: "${query}"`);
    console.error(`[Exa Search] Error type: ${classified.constructor.name}`);
    console.error(`[Exa Search] Error message: ${err.message}`);
    if (err.stack) {
      console.error(`[Exa Search] Stack trace:`, err.stack);
    }

    return {
      query,
      results: [],
      error: userMessage,
      message: userMessage,
    };
  }
}
