import Exa from "exa-js";
import { z } from "zod";
import {
  RateLimitError,
  SearchTimeoutError,
  ToolExecutionError,
  formatErrorForUser,
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

export const exaSearchArgsSchema = z.object({
  query: z.string().describe("The search query"),
  numResults: z
    .number()
    .int()
    .min(1)
    .max(100)
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
    .default(true)
    .describe("Whether to include full text content"),
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
    .default(4)
    .describe("Number of sentences per highlight"),
  summaryQuery: z
    .string()
    .optional()
    .describe("Prompt for AI-generated summaries"),
  subpages: z
    .number()
    .int()
    .min(0)
    .max(8)
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

const exaHighlightSchema = z
  .object({
    snippet: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
  })
  .passthrough();

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

export interface ExaSearchNormalizedSubpage {
  title?: string | null;
  url: string;
  highlights: ExaSearchSubpage["highlights"] extends Array<infer T>
    ? T[]
    : unknown[];
  summary?: string | null;
  fullText?: string | null;
}

export interface ExaSearchNormalizedResult {
  title?: string | null;
  url: string;
  author?: string | null;
  publishedDate?: string | null;
  highlights: ExaSearchResult["highlights"] extends Array<infer T> ? T[] : unknown[];
  summary?: string | null;
  fullText?: string | null;
  snippet?: string | null;
  subpages?: ExaSearchNormalizedSubpage[];
}

export interface ExaSearchToolSuccess {
  query: string;
  results: ExaSearchNormalizedResult[];
  message: string;
  error?: undefined;
}

export interface ExaSearchToolError {
  query: string;
  results: ExaSearchNormalizedResult[];
  message: string;
  error: string;
}

export type ExaSearchToolResult = ExaSearchToolSuccess | ExaSearchToolError;

export interface PerformExaSearchOptions {
  toolName?: string;
  timeoutMs?: number;
}

function buildSearchOptions(args: ExaSearchParsedArgs): Record<string, unknown> {
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

function normalizeResults(
  results: ExaSearchResult[],
  includeText: boolean
): ExaSearchNormalizedResult[] {
  return results.map((result) => {
    const normalizedSubpages = result.subpages?.map((subpage) => ({
      title: subpage.title ?? undefined,
      url: subpage.url,
      highlights: (subpage.highlights ?? []) as ExaSearchNormalizedSubpage["highlights"],
      summary: subpage.summary ?? undefined,
      fullText: includeText ? subpage.text ?? null : undefined,
    }));

    let snippet: string | null | undefined = result.text ?? null;
    if (typeof snippet === "string" && snippet.length > 500) {
      snippet = `${snippet.slice(0, 500)}...`;
    }

    return {
      title: result.title ?? undefined,
      url: result.url,
      author: result.author ?? undefined,
      publishedDate: result.publishedDate ?? undefined,
      highlights: (result.highlights ?? []) as ExaSearchNormalizedResult["highlights"],
      summary: result.summary ?? undefined,
      fullText: includeText ? result.text ?? null : undefined,
      snippet,
      subpages: normalizedSubpages,
    } satisfies ExaSearchNormalizedResult;
  });
}

function classifyError(
  error: Error,
  query: string,
  timeoutMs: number,
  toolName: string
): Error {
  const message = error.message.toLowerCase();

  if (message.includes("timeout")) {
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
  const timeoutMs = options.timeoutMs ?? 30000;
  const args = exaSearchArgsSchema.parse(rawArgs);
  const { query } = args;

  if (!process.env.EXA_API_KEY) {
    const errorMsg = "EXA_API_KEY is not configured. Exa search is unavailable.";
    console.error(errorMsg);
    return {
      error: errorMsg,
      query,
      results: [],
      message:
        "Exa search tool is unavailable. Please continue with other available information.",
    } satisfies ExaSearchToolError;
  }

  try {
    const exa = new Exa(process.env.EXA_API_KEY!);
    const searchOptions = buildSearchOptions(args);

    const rawResult = await withRetry(
      () => exa.searchAndContents(query, searchOptions),
      { timeoutMs }
    );

    const parsed = exaSearchResponseSchema.parse(rawResult);
    const normalizedResults = normalizeResults(parsed.results, args.includeText);

    return {
      query,
      results: normalizedResults,
      message: `Found ${normalizedResults.length} results for: ${query}`,
    } satisfies ExaSearchToolSuccess;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`Exa search failed for query "${query}":`, err);

    const classified = classifyError(err, query, timeoutMs, toolName);
    const userMessage = formatErrorForUser(classified);

    return {
      query,
      results: [],
      error: classified.message,
      message: userMessage,
    } satisfies ExaSearchToolError;
  }
}
