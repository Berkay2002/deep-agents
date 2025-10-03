import type {
  TavilySearchParsedArgs,
  TavilySearchResponse,
  TavilySearchResult,
} from "./schemas.js";

export type TavilySearchToolSuccess = TavilySearchResponse & {
  message: string;
  error?: undefined;
};

export type TavilySearchToolError = {
  query: string;
  results: TavilySearchResult[];
  answer?: string | null;
  images?: TavilySearchResponse["images"];
  follow_up_questions?: TavilySearchResponse["follow_up_questions"];
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

export type BuildTavilyPayloadArgs = TavilySearchParsedArgs;
