// src/utils/tools.ts
import { TavilySearch } from "@langchain/tavily";
import type { StructuredTool } from "@langchain/core/tools";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

// MCP servers configuration
// Note: Currently disabled due to compatibility issues with npx execution
// Many MCP servers are Python-based or lack proper bin configuration for npx
// Future: Add working Node.js MCP servers or use Python-based servers with uvx
const mcpServers = {};

export type McpServerName = string;
export type LoadedTool = StructuredTool;

const allServerNames: string[] = Object.keys(mcpServers);
const hasMcpServers = allServerNames.length > 0;

// Only initialize MCP client if servers are configured
export const mcpClient = hasMcpServers
  ? new MultiServerMCPClient({ mcpServers })
  : null;

let cachedTools: LoadedTool[] | null = null;
const cachedToolsByServer: Partial<Record<McpServerName, LoadedTool[]>> = {};

const fetchToolsForServer = async (
  server: McpServerName
): Promise<LoadedTool[] | null> => {
  if (!mcpClient) {
    console.warn("MCP client not initialized. No MCP servers configured.");
    return null;
  }
  try {
    const tools = await mcpClient.getTools(server);
    cachedToolsByServer[server] = tools as unknown as LoadedTool[];
    return tools as unknown as LoadedTool[];
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
    console.warn(`All MCP servers failed to load: ${failed.join(", ")}. Agent will run without MCP tools.`);
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
      }) as unknown as LoadedTool
    );
  }

  const mcpTools = await loadMcpTools();
  tools.push(...mcpTools);

  return tools;
}
