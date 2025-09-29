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
export type LoadedMcpTool = Tool;

const allServerNames: McpServerName[] = Object.keys(mcpServers) as McpServerName[];

export const mcpClient = new MultiServerMCPClient({
  mcpServers,
});

let cachedTools: LoadedMcpTool[] | null = null;
const cachedToolsByServer: Partial<Record<McpServerName, LoadedMcpTool[]>> = {};

const fetchToolsForServer = async (
  server: McpServerName,
): Promise<LoadedMcpTool[] | null> => {
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
  servers: LoadMcpToolsOptions["servers"],
): McpServerName[] | undefined => {
  if (!servers) {
    return undefined;
  }

  return Array.isArray(servers) ? servers : [servers];
};

export const loadMcpTools = async (
  options: LoadMcpToolsOptions = {},
): Promise<LoadedMcpTool[]> => {
  const serverSelection = normalizeServerSelection(options.servers);
  const shouldRefresh = options.refresh ?? false;
  const targetServers = serverSelection ?? allServerNames;

  if (targetServers.length === 0) {
    return [];
  }

  if (!shouldRefresh) {
    if (!serverSelection && cachedTools) {
      return cachedTools;
    }

    if (serverSelection?.every((server) => cachedToolsByServer[server])) {
      return serverSelection.flatMap(
        (server) => cachedToolsByServer[server] ?? [],
      );
    }
  } else {
    cachedTools = null;
  }

  const serversToFetch = targetServers.filter(
    (server) => shouldRefresh || !cachedToolsByServer[server],
  );

  const fetchResults = await Promise.all(
    serversToFetch.map(async (server) => ({
      server,
      tools: await fetchToolsForServer(server),
    })),
  );

  const failedServers = fetchResults
    .filter((result) => result.tools === null)
    .map((result) => result.server);

  if (failedServers.length > 0 && failedServers.length < targetServers.length) {
    console.warn(
      `Some MCP servers failed to load tools: ${failedServers.join(", ")}. Returning available tools from remaining servers.`,
    );
  }

  const availableTools = targetServers.flatMap(
    (server) => cachedToolsByServer[server] ?? [],
  );

  if (failedServers.length === targetServers.length && availableTools.length === 0) {
    const error = new Error(
      `Failed to load MCP tools from servers: ${failedServers.join(", ")}`,
    );
    throw error;
  }

  cachedTools = allServerNames.flatMap(
    (server) => cachedToolsByServer[server] ?? [],
  );

  return serverSelection ? availableTools : cachedTools;
};
