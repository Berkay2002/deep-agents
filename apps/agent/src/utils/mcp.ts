// src/utils/mcp.ts
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { StructuredTool } from "@langchain/core/tools";
import { MCPConnectionError, withRetry } from "./errors.js";

// MCP servers configuration
// Note: Currently disabled due to compatibility issues with npx execution
// Many MCP servers are Python-based or lack proper bin configuration for npx
// Future: Add working Node.js MCP servers or use Python-based servers with uvx
const mcpServers = {};

export type McpServerName = string;
export type LoadedTool = StructuredTool;

const allServerNames: string[] = Object.keys(mcpServers);
const hasMcpServers = allServerNames.length > 0;

// Connection timeout for MCP servers (10 seconds)
const MCP_CONNECTION_TIMEOUT_MS = 10000;

// Only initialize MCP client if servers are configured
export const mcpClient = hasMcpServers
  ? new MultiServerMCPClient({ mcpServers })
  : null;

let cachedTools: LoadedTool[] | null = null;
const cachedToolsByServer: Partial<Record<McpServerName, LoadedTool[]>> = {};
const failedServers = new Set<McpServerName>();

const fetchToolsForServer = async (
  server: McpServerName
): Promise<LoadedTool[] | null> => {
  if (!mcpClient) {
    console.warn("MCP client not initialized. No MCP servers configured.");
    return null;
  }

  // Skip servers that have previously failed
  if (failedServers.has(server)) {
    console.warn(
      `Skipping MCP server '${server}' - previously failed to connect.`
    );
    return null;
  }

  try {
    // Attempt to fetch tools with retry and timeout
    const tools = await withRetry(
      async () => {
        const result = await mcpClient.getTools(server);
        return result as unknown as LoadedTool[];
      },
      {
        maxAttempts: 2, // Only retry once for MCP connections
        initialDelayMs: 500,
        timeoutMs: MCP_CONNECTION_TIMEOUT_MS,
      }
    );

    cachedToolsByServer[server] = tools;
    console.log(
      `Successfully loaded ${tools.length} tools from MCP server '${server}'`
    );
    return tools;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Mark server as failed to avoid repeated attempts
    failedServers.add(server);

    // Create detailed error with troubleshooting hints
    const mcpError = new MCPConnectionError(server, err.message, err, {
      troubleshooting: [
        "Ensure the MCP server is running and accessible",
        "Check if the server command/path is correct in mcpServers config",
        "Verify the server supports the MCP protocol version",
        "Check server logs for startup errors",
      ],
    });

    console.error(mcpError.message);
    console.error("Troubleshooting steps:", mcpError.context?.troubleshooting);

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