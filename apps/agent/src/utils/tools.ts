// src/utils/tools.ts
import { tool, type StructuredTool } from "@langchain/core/tools";
import {
  performTavilySearch,
  tavilySearchArgsSchema,
  type TavilySearchArgs,
} from "./tavily.js";
import { loadMcpTools } from "./mcp.js";

export type LoadedTool = StructuredTool;

export const internetSearch = tool(
  async (args: TavilySearchArgs) =>
    performTavilySearch(args, { toolName: "internet_search" }),
  {
    name: "internet_search",
    description:
      "Run a web search to find information. Returns structured Tavily search results, optional synthesized answers, and related images when requested. Always check the response for an 'error' field.",
    schema: tavilySearchArgsSchema,
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
