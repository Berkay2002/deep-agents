import { z } from "zod";
import {
  DEFAULT_HIGHLIGHT_SENTENCES,
  EXA_CATEGORIES,
  EXA_LIVECRAWL_MODES,
  EXA_SEARCH_TYPES,
  MAX_RESULTS,
  MAX_SUBPAGES,
} from "./constants.js";

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

const exaHighlightSchema = z.union([
  z.string(),
  z
    .object({
      snippet: z.string().optional().nullable(),
      source: z.string().optional().nullable(),
    })
    .passthrough(),
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

export const exaSearchResponseSchema = z
  .object({
    results: z.array(exaResultSchema).default([]),
  })
  .passthrough();

export type ExaSearchArgs = z.input<typeof exaSearchArgsSchema>;
export type ExaSearchParsedArgs = z.infer<typeof exaSearchArgsSchema>;
export type ExaSearchResponse = z.infer<typeof exaSearchResponseSchema>;
export type ExaSearchResult = ExaSearchResponse["results"][number];
export type ExaSearchSubpage = NonNullable<ExaSearchResult["subpages"]>[number];
