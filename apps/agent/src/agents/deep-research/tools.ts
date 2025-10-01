// Deep Research Agent specific tools
import { tool, type StructuredTool } from "@langchain/core/tools";
import { loadMcpTools } from "../../utils/mcp.js";
import {
  performExaSearch,
  exaSearchArgsSchema,
  type ExaSearchArgs,
} from "../../utils/exa.js";
import {
  performTavilySearch,
  tavilySearchArgsSchema,
  type TavilySearchArgs,
} from "../../utils/tavily.js";

export type LoadedTool = StructuredTool;

export const exaSearch = tool(
  async (args: ExaSearchArgs) =>
    performExaSearch(args, { toolName: "exa_search" }),
  {
    name: "exa_search",
    description:
      "Perform semantic web search using Exa's neural search engine. Returns structured results with highlights, summaries, and optional full text content.",
    schema: exaSearchArgsSchema,
  }
);

export const internetSearch = tool(
  async (args: TavilySearchArgs) =>
    performTavilySearch(args, { toolName: "internet_search" }),
  {
    name: "internet_search",
    description:
      "Run a web search to find information. Returns structured Tavily search results, optional synthesized answers, and related images when requested. Always check the response for an 'error' field before using the results.",
    schema: tavilySearchArgsSchema,
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
