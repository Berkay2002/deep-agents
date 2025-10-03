import Exa from "exa-js";
import { formatErrorForUser, withRetry } from "../errors.js";
import { DEFAULT_TIMEOUT_MS } from "./constants.js";
import { classifyExaError } from "./error-handling.js";
import { buildSearchOptions } from "./options.js";
import { normalizeResults } from "./normalizers.js";
import {
  exaSearchArgsSchema,
  exaSearchResponseSchema,
  type ExaSearchArgs,
} from "./schemas.js";
import type {
  ExaSearchToolResult,
  PerformExaSearchOptions,
} from "./types.js";

export async function performExaSearch(
  rawArgs: ExaSearchArgs,
  options: PerformExaSearchOptions = {}
): Promise<ExaSearchToolResult> {
  const toolName = options.toolName ?? "exa_search";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const args = exaSearchArgsSchema.parse(rawArgs);
  const { query } = args;

  console.log(`[Exa Search] Initiating search for query: "${query}"`);

  if (!process.env.EXA_API_KEY) {
    const errorMsg =
      "EXA_API_KEY is not configured. Exa search is unavailable.";
    console.error(
      "[Exa Search] CONFIGURATION ERROR: EXA_API_KEY not found in environment"
    );
    return {
      error: errorMsg,
      query,
      results: [],
      message:
        "Exa search tool is unavailable. Please continue with other available information.",
    };
  }

  try {
    const exa = new Exa(process.env.EXA_API_KEY);
    const searchOptions = buildSearchOptions(args);

    console.log(
      `[Exa Search] Search options:`,
      JSON.stringify(searchOptions, null, 2)
    );

    const rawResult = await withRetry(
      () => exa.searchAndContents(query, searchOptions),
      { timeoutMs }
    );

    const parsed = exaSearchResponseSchema.parse(rawResult);
    const normalizedResults = normalizeResults(parsed.results, args.includeText);

    console.log(
      `[Exa Search] SUCCESS: Found ${normalizedResults.length} results for query: "${query}"`
    );

    return {
      query,
      results: normalizedResults,
      message: `Found ${normalizedResults.length} results for: ${query}`,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    const classified = classifyExaError(err, query, timeoutMs, toolName);
    const userMessage = formatErrorForUser(classified);

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
