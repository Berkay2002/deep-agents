/** biome-ignore-all lint/correctness/noUnusedVariables: <> */
import { z } from "zod";
import {
  formatErrorForUser,
  RateLimitError,
  SearchTimeoutError,
  ToolExecutionError,
  withRetry,
} from "./errors.js";

export const TAVILY_TOPICS = ["general", "news", "finance"] as const;
export const TAVILY_SEARCH_DEPTH = ["basic", "advanced"] as const;

// Constants for magic numbers
const DEFAULT_MAX_RESULTS = 5;
const MAX_RESULTS_LIMIT = 10;
const MAX_DAYS_LIMIT = 365;
const MAX_DOMAINS_LIMIT = 20;
const SNIPPET_LENGTH_LIMIT = 280;
const DEFAULT_TIMEOUT_MS = 30_000;
const RATE_LIMIT_STATUS_CODE = 429;
const MS_IN_SECOND = 1000;
const RATE_LIMIT_REGEX = /429|rate limit/i;

export const tavilySearchArgsSchema = z.object({
  query: z.string().describe("The search query"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(MAX_RESULTS_LIMIT)
    .optional()
    .default(DEFAULT_MAX_RESULTS)
    .describe("Maximum number of results to return"),
  topic: z
    .enum(TAVILY_TOPICS)
    .optional()
    .default("general")
    .describe("Search topic category"),
  includeRawContent: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include the raw HTML/text content for each result"),
  searchDepth: z
    .enum(TAVILY_SEARCH_DEPTH)
    .optional()
    .default("basic")
    .describe("Depth of Tavily search (basic or advanced)"),
  includeAnswer: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to include Tavily's synthesized answer"),
  includeImages: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to include related images"),
  includeImageDescriptions: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to include descriptions for returned images"),
  days: z
    .number()
    .int()
    .min(1)
    .max(MAX_DAYS_LIMIT)
    .optional()
    .describe("Limit results to the last N days"),
  includeDomains: z
    .array(z.string().min(1))
    .max(MAX_DOMAINS_LIMIT)
    .optional()
    .describe("Restrict search to these domains"),
  excludeDomains: z
    .array(z.string().min(1))
    .max(MAX_DOMAINS_LIMIT)
    .optional()
    .describe("Exclude these domains from search results"),
  language: z
    .string()
    .optional()
    .describe("Prefer results in this ISO language code"),
  location: z
    .string()
    .optional()
    .describe("Bias results to a geographic location"),
});

const tavilySearchResultSchema = z
  .object({
    title: z.string().optional().nullable(),
    url: z.string(),
    content: z.string().optional().nullable(),
    snippet: z.string().optional().nullable(),
    rawContent: z.string().optional().nullable(),
    score: z.number().optional().nullable(),
    publishedDate: z.string().optional().nullable(),
    author: z.string().optional().nullable(),
  })
  .passthrough();

const tavilyImageSchema = z
  .object({
    url: z.string(),
    description: z.string().optional().nullable(),
  })
  .passthrough();

const tavilySearchResponseSchema = z
  .object({
    query: z.string(),
    answer: z.string().optional().nullable(),
    followUpQuestions: z.array(z.string()).optional().nullable(),
    results: z.array(tavilySearchResultSchema).default([]),
    images: z.array(tavilyImageSchema).optional().nullable(),
  })
  .passthrough();

export type TavilySearchArgs = z.input<typeof tavilySearchArgsSchema>;
export type TavilySearchParsedArgs = z.infer<typeof tavilySearchArgsSchema>;
export type TavilySearchResponse = z.infer<typeof tavilySearchResponseSchema>;
export type TavilySearchResult = TavilySearchResponse["results"][number];

export interface TavilySearchToolSuccess extends TavilySearchResponse {
  message: string;
  error?: undefined;
}

export type TavilySearchToolError = {
  query: string;
  results: TavilySearchResult[];
  answer?: string | null;
  images?: TavilySearchResponse["images"];
  followUpQuestions?: TavilySearchResponse["follow_up_questions"];
  message: string;
  error: string;
};

export type TavilySearchToolResult =
  | TavilySearchToolSuccess
  | TavilySearchToolError;

export type PerformTavilySearchOptions = {
  toolName?: string;
  timeoutMs?: number;
};

function buildRequestPayload(
  apiKey: string,
  args: TavilySearchParsedArgs
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  payload.api_key = apiKey;
  payload.query = args.query;
  payload.max_results = args.maxResults;
  payload.topic = args.topic;
  payload.include_raw_content = args.includeRawContent;
  payload.search_depth = args.searchDepth;
  payload.include_answer = args.includeAnswer;
  payload.include_images = args.includeImages;
  payload.include_image_descriptions = args.includeImageDescriptions;
  payload.days = args.days;
  payload.include_domains = args.includeDomains;
  payload.exclude_domains = args.excludeDomains;
  payload.language = args.language;
  payload.location = args.location;

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

function normalizeResults(
  results: TavilySearchResult[],
  includeRawContent: boolean
): TavilySearchResult[] {
  return results.map((result) => {
    const normalized: Record<string, unknown> = { ...result };

    if (!includeRawContent) {
      normalized.rawContent = undefined;
    }

    if (!normalized.snippet && typeof normalized.content === "string") {
      const content = normalized.content as string;
      normalized.snippet =
        content.length > SNIPPET_LENGTH_LIMIT
          ? `${content.slice(0, SNIPPET_LENGTH_LIMIT)}...`
          : content;
    }

    return normalized as TavilySearchResult;
  });
}

export async function performTavilySearch(
  rawArgs: TavilySearchArgs,
  options: PerformTavilySearchOptions = {}
): Promise<TavilySearchToolResult> {
  const toolName = options.toolName ?? "internet_search";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const args = tavilySearchArgsSchema.parse(rawArgs);
  const { query } = args;

  if (!process.env.TAVILY_API_KEY) {
    const errorMsg =
      "TAVILY_API_KEY is not configured. Web search is unavailable.";
    return {
      error: errorMsg,
      results: [],
      query,
      message:
        "Search tool is unavailable. Please continue with other available information.",
    };
  }

  try {
    const response = await withRetry(
      async () => {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildRequestPayload(process.env.TAVILY_API_KEY || "", args)
          ),
        });

        if (res.status === RATE_LIMIT_STATUS_CODE) {
          const retryAfterHeader = res.headers.get("retry-after");
          const retryAfter = retryAfterHeader
            ? Number.parseFloat(retryAfterHeader) * MS_IN_SECOND
            : undefined;
          throw new RateLimitError(
            "Tavily",
            Number.isFinite(retryAfter) ? retryAfter : undefined
          );
        }

        if (!res.ok) {
          const details = await res.text().catch(() => {
            // Intentionally empty - we'll handle the error without details
          });
          throw new Error(
            `Tavily API error: ${res.status} ${res.statusText}${
              details ? ` - ${details}` : ""
            }`
          );
        }

        const json = await res.json();
        return tavilySearchResponseSchema.parse(json);
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        timeoutMs,
      }
    );

    return {
      ...response,
      results: normalizeResults(response.results, args.includeRawContent),
      message: `Found ${response.results.length} results for: ${query}`,
      // Respect includeAnswer/includeImages toggles by removing if not requested
      answer: args.includeAnswer ? response.answer : undefined,
      images: args.includeImages ? response.images : undefined,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    if (err instanceof RateLimitError || RATE_LIMIT_REGEX.test(err.message)) {
      return {
        error: "Search rate limit exceeded. Please wait a moment.",
        results: [],
        query,
        message:
          "Search service is temporarily rate-limited. Please continue with available information or try again shortly.",
      };
    }

    if (err.message.includes("timed out")) {
      const timeoutError = new SearchTimeoutError(query, timeoutMs);
      return {
        error: formatErrorForUser(timeoutError),
        results: [],
        query,
        message:
          "The search took too long to complete. Try a more specific search query or continue with available information.",
      };
    }

    const toolError =
      err instanceof ToolExecutionError
        ? err
        : new ToolExecutionError(toolName, err.message, err);

    return {
      error: formatErrorForUser(toolError),
      results: [],
      query,
      message:
        "Search encountered an error. Please continue with other available information or try a different query.",
    };
  }
}
