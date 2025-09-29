import { TavilySearch } from "@langchain/tavily";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { StructuredTool } from "@langchain/core/tools";

export type LoadedTool = StructuredTool;

async function loadMcpTools(): Promise<LoadedTool[]> {
  const serverUrl = process.env.MCP_SERVER_URL;

  if (!serverUrl) {
    return [];
  }

  const serverToken = process.env.MCP_SERVER_TOKEN ?? process.env.MCP_API_KEY;

  const client = new MultiServerMCPClient({
    mcpServers: {
      default: {
        transport: "sse",
        url: serverUrl,
        headers: serverToken
          ? {
              Authorization: `Bearer ${serverToken}`,
            }
          : undefined,
      },
    },
  });

  try {
    await client.initializeConnections();
    const tools = await client.getTools();

    if (Array.isArray(tools)) {
      return tools;
    }
  } catch (error) {
    console.warn("Failed to initialize MCP tools", error);
  } finally {
    await client.close?.();
  }

  return [];
}

export async function loadDefaultTools(): Promise<LoadedTool[]> {
  const tools: LoadedTool[] = [];

  if (process.env.TAVILY_API_KEY) {
    tools.push(
      new TavilySearch({
        tavilyApiKey: process.env.TAVILY_API_KEY,
        maxResults: 5,
      })
    );
  }

  const mcpTools = await loadMcpTools();
  tools.push(...mcpTools);

  return tools;
}
