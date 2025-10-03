export const TAVILY_TOPICS = ["general", "news", "finance"] as const;
export const TAVILY_SEARCH_DEPTH = ["basic", "advanced"] as const;

export const DEFAULT_MAX_RESULTS = 5;
export const MAX_RESULTS_LIMIT = 10;
export const MAX_DAYS_LIMIT = 365;
export const MAX_DOMAINS_LIMIT = 20;
export const SNIPPET_LENGTH_LIMIT = 280;
export const DEFAULT_TIMEOUT_MS = 30_000;
export const RATE_LIMIT_STATUS_CODE = 429;
export const MS_IN_SECOND = 1000;
export const RATE_LIMIT_REGEX = /429|rate limit/i;
