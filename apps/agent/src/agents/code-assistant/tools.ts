// Code Assistant Agent specific tools
import { TavilySearch } from "@langchain/tavily";
import { tool, type StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export type LoadedTool = StructuredTool;

type InternetSearchTopic = "general" | "news" | "finance";

// Reuse internet search for code-related queries (documentation, examples, etc.)
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
      "Run a web search to find information about coding topics, documentation, examples, or solutions. Returns search results or an error message if the search fails.",
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
 * Load tools specific to code assistance tasks
 */
export async function loadCodeTools(): Promise<LoadedTool[]> {
  const tools: LoadedTool[] = [];

  if (process.env.TAVILY_API_KEY) {
    tools.push(internetSearch as LoadedTool);
  } else {
    console.warn(
      "TAVILY_API_KEY not set. The internet_search tool will be unavailable."
    );
  }

  // TODO: Add code-specific tools like:
  // - Code execution/testing tools
  // - Static analysis tools
  // - GitHub code search
  // - Documentation search
  // - Package/library search

  return tools;
}
