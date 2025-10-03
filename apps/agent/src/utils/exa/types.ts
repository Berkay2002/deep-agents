import type {
  ExaSearchParsedArgs,
  ExaSearchResponse,
  ExaSearchResult,
} from "./schemas.js";

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

export type ExaSearchToolResult =
  | ExaSearchToolSuccess
  | ExaSearchToolError;

export type PerformExaSearchOptions = {
  toolName?: string;
  timeoutMs?: number;
};

export type BuildSearchOptionsArgs = ExaSearchParsedArgs;
export type ParsedExaResponse = ExaSearchResponse;
export type ParsedExaResult = ExaSearchResult;
