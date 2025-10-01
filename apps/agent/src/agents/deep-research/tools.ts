// Deep Research Agent specific tools
import { TavilySearch } from "@langchain/tavily";
import { tool, type StructuredTool } from "@langchain/core/tools";
import Exa from "exa-js";
import { z } from "zod";
import { loadMcpTools } from "../../utils/mcp.js";

export type LoadedTool = StructuredTool;

type InternetSearchTopic = "general" | "news" | "finance";

const EXA_CATEGORY = z.enum([
  "company",
  "research paper",
  "news",
  "github",
  "tweet",
  "movie",
  "song",
  "personal site",
  "pdf",
]);

type ExaCategory = z.infer<typeof EXA_CATEGORY>;

type ExaClient = InstanceType<typeof Exa>;
type ExaSearchResponse = Awaited<ReturnType<ExaClient["searchAndContents"]>>;
type ExaSearchResult = ExaSearchResponse["results"][number];
type ExaSubpage = NonNullable<ExaSearchResult["subpages"]>[number];

export const exaSearch = tool(
  async ({
    query,
    numResults = 10,
    type = "auto",
    includeText = true,
    includeHighlights = true,
    highlightQuery,
    numHighlightSentences = 4,
    summaryQuery,
    subpages = 0,
    subpageTargets,
    livecrawl = "always",
    category,
    startCrawlDate,
    endCrawlDate,
  }: {
    query: string;
    numResults?: number;
    type?: "auto" | "neural" | "keyword";
    includeText?: boolean;
    includeHighlights?: boolean;
    highlightQuery?: string;
    numHighlightSentences?: number;
    summaryQuery?: string;
    subpages?: number;
    subpageTargets?: string[];
    livecrawl?: "always" | "never" | "asAvailable";
    category?: ExaCategory;
    startCrawlDate?: string;
    endCrawlDate?: string;
  }) => {
    if (!process.env.EXA_API_KEY) {
      const errorMsg = "EXA_API_KEY is not configured. Exa search is unavailable.";
      console.error(errorMsg);
      return {
        error: errorMsg,
        results: [],
        query,
        message:
          "Exa search tool is unavailable. Please continue with other available information.",
      };
    }

    try {
      const exa = new Exa(process.env.EXA_API_KEY!);

      const contents: Record<string, unknown> = {};
      if (includeText) {
        contents.text = true;
      }
      if (includeHighlights) {
        contents.highlights = {
          query: highlightQuery ?? query,
          numSentences: numHighlightSentences,
        };
      }
      if (summaryQuery) {
        contents.summary = {
          query: summaryQuery,
        };
      }

      const searchOptions: Record<string, unknown> = {
        numResults,
        type,
      };

      if (Object.keys(contents).length > 0) {
        searchOptions.contents = contents;
      }

      if (typeof subpages === "number" && subpages > 0) {
        searchOptions.subpages = subpages;
        if (subpageTargets?.length) {
          searchOptions.subpageTargets = subpageTargets;
        }
      }

      searchOptions.livecrawl = livecrawl;

      if (category) {
        searchOptions.category = category;
      }

      if (startCrawlDate) {
        searchOptions.startCrawlDate = startCrawlDate;
      }

      if (endCrawlDate) {
        searchOptions.endCrawlDate = endCrawlDate;
      }

      const result = await exa.searchAndContents(query, searchOptions);

      return {
        query,
        results: result.results.map((r: ExaSearchResult) => ({
          title: r.title,
          url: r.url,
          author: r.author,
          publishedDate: r.publishedDate,
          highlights: r.highlights ?? [],
          summary: r.summary,
          fullText: includeText ? r.text : undefined,
          snippet: r.text ? (r.text.length > 500 ? r.text.slice(0, 500) + '...' : r.text) : undefined,
          subpages: r.subpages?.map((subpage: ExaSubpage) => ({
            title: subpage.title,
            url: subpage.url,
            highlights: subpage.highlights ?? [],
            summary: subpage.summary,
            fullText: includeText ? subpage.text : undefined,
          })),
        })),
        message: `Found ${result.results.length} results for: ${query}`,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Exa search failed for query "${query}":`, err);

      return {
        error: err.message,
        results: [],
        query,
        message:
          "Exa search encountered an error. Please continue with other available information or try a different query.",
      };
    }
  },
  {
    name: "exa_search",
    description:
      "Perform semantic web search using Exa's neural search engine. Returns structured results with highlights, summaries, and optional full text content.",
    schema: z.object({
      query: z.string().describe("The search query"),
      numResults: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(10)
        .describe("Number of results to return"),
      type: z
        .enum(["auto", "neural", "keyword"])
        .optional()
        .default("auto")
        .describe("Search strategy"),
      includeText: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include full text content"),
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
        .min(1)
        .max(10)
        .optional()
        .default(4)
        .describe("Number of sentences per highlight"),
      summaryQuery: z
        .string()
        .optional()
        .describe("Prompt for AI-generated summaries"),
      subpages: z
        .number()
        .min(0)
        .max(8)
        .optional()
        .default(0)
        .describe("Number of subpages to fetch for each result"),
      subpageTargets: z
        .array(z.string())
        .optional()
        .describe("Preferred subpage keywords or sections"),
      livecrawl: z
        .enum(["always", "never", "asAvailable"])
        .optional()
        .default("always")
        .describe("Whether to live crawl pages"),
      category: EXA_CATEGORY.optional().describe("Content category filter"),
      startCrawlDate: z
        .string()
        .optional()
        .describe("Start date for crawled content (YYYY-MM-DD)"),
      endCrawlDate: z
        .string()
        .optional()
        .describe("End date for crawled content (YYYY-MM-DD)"),
    }),
  }
);

export const internetSearch = tool(
  async ({
    query,
    maxResults = 5,
    topic = "general" as InternetSearchTopic,
    includeRawContent = false,
  }: {
    query: string;
    maxResults?: number;
    topic?: InternetSearchTopic;
    includeRawContent?: boolean;
  }) => {
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
      const tavilySearch = new TavilySearch({
        maxResults,
        topic,
        tavilyApiKey: process.env.TAVILY_API_KEY!,
        includeRawContent,
      });

      return await tavilySearch.invoke({ query });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Internet search failed for query "${query}":`, err);

      return {
        error: err.message,
        results: [],
        query,
        message:
          "Search encountered an error. Please continue with other available information or try a different query.",
      };
    }
  },
  {
    name: "internet_search",
    description:
      "Run a web search to find information. Returns search results or an error message if the search fails. Always check the response for an 'error' field.",
    schema: z.object({
      query: z.string().describe("The search query"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general")
        .describe("Search topic category"),
      includeRawContent: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include raw content"),
    }),
  }
);

/**
 * Load tools specific to research tasks
 * Includes public MCP servers (Sequential Thinking, DeepWiki)
 * Note: GitHub Copilot MCP requires per-user authentication and is configured
 * separately through the UI settings
 */
export async function loadResearchTools(): Promise<LoadedTool[]> {
  const tools: LoadedTool[] = [];

  if (process.env.EXA_API_KEY) {
    tools.push(exaSearch as LoadedTool);
  } else {
    console.warn(
      "EXA_API_KEY not set. The exa_search tool will be unavailable."
    );
  }

  if (process.env.TAVILY_API_KEY) {
    tools.push(internetSearch as LoadedTool);
  } else {
    console.warn(
      "TAVILY_API_KEY not set. The internet_search tool will be unavailable."
    );
  }

  // Load public MCP servers (Sequential Thinking, DeepWiki)
  // GitHub Copilot is handled separately through UI configuration
  const mcpTools = await loadMcpTools();
  tools.push(...mcpTools);

  return tools;
}
