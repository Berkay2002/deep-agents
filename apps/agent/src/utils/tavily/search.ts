import {
  formatErrorForUser,
  RateLimitError,
  SearchTimeoutError,
  ToolExecutionError,
  withRetry,
} from "../errors.js";
import {
  DEFAULT_TIMEOUT_MS,
  MS_IN_SECOND,
  RATE_LIMIT_REGEX,
  RATE_LIMIT_STATUS_CODE,
} from "./constants.js";
import { normalizeResults } from "./normalizers.js";
import { buildRequestPayload } from "./payload.js";
import {
  tavilySearchArgsSchema,
  tavilySearchResponseSchema,
  type TavilySearchArgs,
} from "./schemas.js";
import type {
  PerformTavilySearchOptions,
  TavilySearchToolResult,
} from "./types.js";

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
          const details = await res.text().catch(() => {});
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
