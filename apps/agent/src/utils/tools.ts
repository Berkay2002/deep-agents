// src/utils/tools.ts
import { tool, type StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  withRetry,
  SearchTimeoutError,
  ToolExecutionError,
  formatErrorForUser,
} from "./errors.js";
import { loadMcpTools } from "./mcp.js";

export type LoadedTool = StructuredTool;

type InternetSearchTopic = "general" | "news" | "finance";

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
      // Execute search with retry logic and timeout
      const result = await withRetry(
        async () => {
          // Call Tavily API directly to get structured results
          // TavilySearch wrapper returns plain text, we need the JSON structure
          const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: process.env.TAVILY_API_KEY!,
              query,
              max_results: maxResults,
              topic,
              include_raw_content: includeRawContent,
              include_answer: false, // We don't need Tavily's AI answer
            }),
          });

          if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
          }

          return await response.json();
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          timeoutMs: 30000, // 30 second timeout
        }
      );

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Log the error for debugging
      console.error(`Internet search failed for query "${query}":`, err);

      // Check if it's a timeout error
      if (err.message.includes("timed out")) {
        const timeoutError = new SearchTimeoutError(query, 30000);
        return {
          error: formatErrorForUser(timeoutError),
          results: [],
          query,
          message:
            "The search took too long to complete. Try a more specific search query or continue with available information.",
        };
      }

      // Handle rate limiting
      if (err.message.includes("429") || err.message.includes("rate limit")) {
        return {
          error: "Search rate limit exceeded. Please wait a moment.",
          results: [],
          query,
          message:
            "Search service is temporarily rate-limited. Please continue with available information or try again shortly.",
        };
      }

      // Generic error handling
      const toolError = new ToolExecutionError("internet_search", err.message, err);
      return {
        error: formatErrorForUser(toolError),
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

// === High-level tool loader (used by Deep Agent) ===
export async function loadDefaultTools(): Promise<LoadedTool[]> {
  const tools: LoadedTool[] = [];

  if (process.env.TAVILY_API_KEY) {
    tools.push(internetSearch as LoadedTool);
  } else {
    console.warn(
      "TAVILY_API_KEY not set. The internet_search tool will be unavailable."
    );
  }

  // Load MCP tools from configured servers (Sequential Thinking, DeepWiki, GitHub Copilot)
  const mcpTools = await loadMcpTools();
  tools.push(...mcpTools);

  return tools;
}
