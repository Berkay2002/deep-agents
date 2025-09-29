// src/utils/tools.ts
import { TavilySearch } from "@langchain/tavily";
import type { Tool } from "@langchain/core/tools";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const defaultMathUrl = process.env.MCP_MATH_URL ?? "http://localhost:3030/mcp";
const defaultWeatherUrl =
  process.env.MCP_WEATHER_URL ?? "http://localhost:3031/mcp";

const mcpServers = {
  math: {
    transport: "sse" as const,
    url: defaultMathUrl,
  },
  weather: {
    transport: "sse" as const,
    url: defaultWeatherUrl,
  },
};

export type McpServerName = keyof typeof mcpServers;
export type LoadedTool = Tool;

const allServerNames: McpServerName[] = Object.keys(
  mcpServers
) as McpServerName[];

export const mcpClient = new MultiServerMCPClient({
  mcpServers,
});

let cachedTools: LoadedTool[] | null = null;
const cachedToolsByServer: Partial<Record<McpServerName, LoadedTool[]>> = {};

const fetchToolsForServer = async (
  server: McpServerName
): Promise<LoadedTool[] | null> => {
  try {
    const tools = await mcpClient.getTools(server);
    cachedToolsByServer[server] = tools;
    return tools;
  } catch (error) {
    console.error(`Failed to load MCP tools for server: ${server}.`, error);
    return null;
  }
};

export interface LoadMcpToolsOptions {
  servers?: McpServerName | McpServerName[];
  refresh?: boolean;
}

const normalizeServerSelection = (
  servers: LoadMcpToolsOptions["servers"]
): McpServerName[] | undefined => {
  if (!servers) return undefined;
  return Array.isArray(servers) ? servers : [servers];
};

export const loadMcpTools = async (
  options: LoadMcpToolsOptions = {}
): Promise<LoadedTool[]> => {
  const serverSelection = normalizeServerSelection(options.servers);
  const shouldRefresh = options.refresh ?? false;
  const targetServers = serverSelection ?? allServerNames;

  if (targetServers.length === 0) return [];

  if (!shouldRefresh) {
    if (!serverSelection && cachedTools) return cachedTools;
    if (serverSelection?.every((s) => cachedToolsByServer[s])) {
      return serverSelection.flatMap((s) => cachedToolsByServer[s] ?? []);
    }
  } else {
    cachedTools = null;
  }

  const serversToFetch = targetServers.filter(
    (s) => shouldRefresh || !cachedToolsByServer[s]
  );

  const results = await Promise.all(
    serversToFetch.map(async (s) => ({ server: s, tools: await fetchToolsForServer(s) }))
  );

  const failed = results.filter((r) => r.tools === null).map((r) => r.server);

  if (failed.length > 0 && failed.length < targetServers.length) {
    console.warn(
      `Some MCP servers failed to load tools: ${failed.join(", ")}. Returning available tools.`
    );
  }

  const available = targetServers.flatMap((s) => cachedToolsByServer[s] ?? []);

  if (failed.length === targetServers.length && available.length === 0) {
    throw new Error(`Failed to load MCP tools from servers: ${failed.join(", ")}`);
  }

  cachedTools = allServerNames.flatMap((s) => cachedToolsByServer[s] ?? []);
  return serverSelection ? available : cachedTools;
};

// === High-level tool loader (used by Deep Agent) ===
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
