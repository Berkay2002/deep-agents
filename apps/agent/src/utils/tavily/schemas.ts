import { z } from "zod";
import {
  DEFAULT_MAX_RESULTS,
  MAX_DAYS_LIMIT,
  MAX_DOMAINS_LIMIT,
  MAX_RESULTS_LIMIT,
  TAVILY_SEARCH_DEPTH,
  TAVILY_TOPICS,
} from "./constants.js";

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

export const tavilySearchResponseSchema = z
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
