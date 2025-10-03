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

export const MAX_RESULTS = 100;
export const DEFAULT_HIGHLIGHT_SENTENCES = 4;
export const MAX_SUBPAGES = 8;
export const MAX_SNIPPET_LENGTH = 500;
export const MAX_TEXT_LENGTH = 10_000;
export const DEFAULT_TIMEOUT_MS = 30_000;
