import { z } from "zod";
import {
  withRetry,
  SearchTimeoutError,
  ToolExecutionError,
  formatErrorForUser,
  RateLimitError,
} from "./errors.js";

export const TAVILY_TOPICS = ["general", "news", "finance"] as const;
export const TAVILY_SEARCH_DEPTH = ["basic", "advanced"] as const;

export const tavilySearchArgsSchema = z.object({
  query: z.string().describe("The search query"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(5)
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
    .max(365)
    .optional()
    .describe("Limit results to the last N days"),
  includeDomains: z
    .array(z.string().min(1))
    .max(20)
    .optional()
    .describe("Restrict search to these domains"),
  excludeDomains: z
    .array(z.string().min(1))
    .max(20)
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
    raw_content: z.string().optional().nullable(),
    score: z.number().optional().nullable(),
    published_date: z.string().optional().nullable(),
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
    follow_up_questions: z.array(z.string()).optional().nullable(),
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

export interface TavilySearchToolError {
  query: string;
  results: TavilySearchResult[];
  answer?: string | null;
  images?: TavilySearchResponse["images"];
  follow_up_questions?: TavilySearchResponse["follow_up_questions"];
  message: string;
  error: string;
}

export type TavilySearchToolResult =
  | TavilySearchToolSuccess
  | TavilySearchToolError;

export interface PerformTavilySearchOptions {
  toolName?: string;
  timeoutMs?: number;
}

function buildRequestPayload(
  apiKey: string,
  args: TavilySearchParsedArgs
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    api_key: apiKey,
    query: args.query,
    max_results: args.maxResults,
    topic: args.topic,
    include_raw_content: args.includeRawContent,
    search_depth: args.searchDepth,
    include_answer: args.includeAnswer,
    include_images: args.includeImages,
    include_image_descriptions: args.includeImageDescriptions,
    days: args.days,
    include_domains: args.includeDomains,
    exclude_domains: args.excludeDomains,
    language: args.language,
    location: args.location,
  };

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
      delete normalized.raw_content;
    }

    if (!normalized.snippet && typeof normalized.content === "string") {
      const content = normalized.content as string;
      normalized.snippet =
        content.length > 280 ? `${content.slice(0, 280)}...` : content;
    }

    return normalized as TavilySearchResult;
  });
}

export async function performTavilySearch(
  rawArgs: TavilySearchArgs,
  options: PerformTavilySearchOptions = {}
): Promise<TavilySearchToolResult> {
  const toolName = options.toolName ?? "internet_search";
  const timeoutMs = options.timeoutMs ?? 30000;
  const args = tavilySearchArgsSchema.parse(rawArgs);
  const { query } = args;

  if (!process.env.TAVILY_API_KEY) {
    const errorMsg =
      "TAVILY_API_KEY is not configured. Web search is unavailable.";
    console.error(errorMsg);
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
            buildRequestPayload(process.env.TAVILY_API_KEY!, args)
          ),
        });

        if (res.status === 429) {
          const retryAfterHeader = res.headers.get("retry-after");
          const retryAfter = retryAfterHeader
            ? Number.parseFloat(retryAfterHeader) * 1000
            : undefined;
          throw new RateLimitError("Tavily", Number.isFinite(retryAfter)
            ? retryAfter
            : undefined);
        }

        if (!res.ok) {
          const details = await res.text().catch(() => undefined);
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
    console.error(`Internet search failed for query "${query}":`, err);

    if (err instanceof RateLimitError || /429|rate limit/i.test(err.message)) {
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
