// src/utils/mcp.ts
// Integration layer between the modular MCP client and the agent's tool system

import type { StructuredTool } from "@langchain/core/tools";
import type { MultiServerMCPClient } from "@langchain/mcp-adapters";
import {
  createMultiMcpClient,
  loadMcpServerFromEnv,
  type McpServerOptions,
} from "../mcp/index.js";
import { McpConnectionError, withRetry } from "./errors.js";

export type McpServerName = string;
export type LoadedTool = StructuredTool;

// Global MCP client instance (singleton pattern)
let mcpClientInstance: MultiServerMCPClient | null = null;

// Cache for loaded tools
let cachedTools: LoadedTool[] | null = null;
const cachedToolsByServer: Partial<Record<McpServerName, LoadedTool[]>> = {};
const failedServers = new Set<McpServerName>();

// Connection timeout for MCP servers (5 seconds to prevent hanging)
const MCP_CONNECTION_TIMEOUT_MS = 5000;
const INIT_TIMEOUT_MS = 15_000;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;
const MAX_FETCH_ATTEMPTS = 2;
const INITIAL_FETCH_DELAY_MS = 500;

// Define a proper type for the client initialization result
type ClientInitResult = {
  client: MultiServerMCPClient;
  tools: LoadedTool[];
};

/**
 * Load MCP servers configuration from environment variables
 *
 * Checks for MCP_LANGCHAIN_URL and loads the LangChain docs server if available.
 * Also loads Sequential Thinking, DeepWiki, and GitHub Copilot servers.
 *
 * @returns Map of server names to configuration options
 */
function loadMcpServersConfig(): Record<string, McpServerOptions> {
  const servers: Record<string, McpServerOptions> = {};

  // Load LangChain docs server from MCP_LANGCHAIN_URL
  const langchainConfig = loadMcpServerFromEnv("MCP_LANGCHAIN");
  if (langchainConfig) {
    servers["langchain-docs"] = langchainConfig;
  }

  // Load Sequential Thinking server (always available)
  servers["sequential-thinking"] = {
    url: "https://remote.mcpservers.org/sequentialthinking/mcp",
    automaticSseFallback: true,
    reconnect: {
      enabled: true,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      delayMs: RETRY_DELAY_MS,
    },
  };

  // Load DeepWiki server (always available)
  servers.deepwiki = {
    url: "https://mcp.deepwiki.com/mcp",
    automaticSseFallback: true,
    reconnect: {
      enabled: true,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      delayMs: RETRY_DELAY_MS,
    },
  };

  // Load GitHub Copilot server if GITHUB_PAT is provided
  const githubPat = process.env.GITHUB_PAT;
  if (githubPat) {
    servers["github-copilot"] = {
      url: "https://api.githubcopilot.com/mcp/",
      headers: {
        authorization: `Bearer ${githubPat}`,
      },
      automaticSseFallback: true,
      reconnect: {
        enabled: true,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        delayMs: RETRY_DELAY_MS,
      },
    };
  }

  return servers;
}

/**
 * Initialize the MCP client with configured servers
 *
 * This function implements a singleton pattern to ensure we only
 * create one MCP client instance across the application.
 *
 * @returns MultiServerMCPClient instance or null if no servers configured
 */
async function initializeMcpClient(): Promise<MultiServerMCPClient | null> {
  if (mcpClientInstance) {
    return mcpClientInstance;
  }

  const serversConfig = loadMcpServersConfig();
  const serverNames = Object.keys(serversConfig);

  if (serverNames.length === 0) {
    return null;
  }

  try {
    // Add overall timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("MCP client initialization timed out")),
        INIT_TIMEOUT_MS
      );
    });

    const initPromise = createMultiMcpClient(serversConfig, {
      useStandardContentBlocks: true,
      defaultToolTimeout: MCP_CONNECTION_TIMEOUT_MS,
      throwOnLoadError: false, // Don't throw on individual server failures
      prefixToolNameWithServerName: true, // Prefix to avoid name collisions
    });

    const { client, tools } = (await Promise.race([
      initPromise,
      timeoutPromise,
    ])) as ClientInitResult;

    mcpClientInstance = client;
    cachedTools = tools;

    return client;
  } catch {
    // Silently handle initialization errors
    return null;
  }
}

/**
 * Fetch tools from a specific MCP server with error handling
 *
 * @param server - Server name to fetch tools from
 * @returns Array of tools or null if server failed
 */
const fetchToolsForServer = async (
  server: McpServerName
): Promise<LoadedTool[] | null> => {
  if (!mcpClientInstance) {
    return null;
  }

  // Skip servers that have previously failed
  if (failedServers.has(server)) {
    return null;
  }

  try {
    // Attempt to fetch tools with retry and timeout
    const tools = await withRetry(
      async () => {
        const result = await mcpClientInstance?.getTools(server);
        return result as unknown as LoadedTool[];
      },
      {
        maxAttempts: MAX_FETCH_ATTEMPTS, // Only retry once for MCP connections
        initialDelayMs: INITIAL_FETCH_DELAY_MS,
        timeoutMs: MCP_CONNECTION_TIMEOUT_MS,
      }
    );

    cachedToolsByServer[server] = tools;
    return tools;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Mark server as failed to avoid repeated attempts
    failedServers.add(server);

    // Create detailed error with troubleshooting hints
    new McpConnectionError(server, err.message, err, {
      troubleshooting: [
        "Ensure the MCP server is running and accessible",
        "Check if the URL is correct in environment variables",
        "Verify network connectivity to the MCP server",
        "Check server logs for startup errors",
      ],
    });

    return null;
  }
};

/**
 * Options for loading MCP tools
 */
export type LoadMcpToolsOptions = {
  /**
   * Optional array of server names to filter tools by.
   * If not provided, returns tools from all servers.
   */
  servers?: McpServerName | McpServerName[];

  /**
   * Whether to refresh the tools cache and reconnect to servers.
   * Default: false (use cached tools if available)
   */
  refresh?: boolean;
};

/**
 * Normalize server selection to array format
 */
const normalizeServerSelection = (
  servers: LoadMcpToolsOptions["servers"]
): McpServerName[] | undefined => {
  if (!servers) {
    return;
  }
  return Array.isArray(servers) ? servers : [servers];
};

/**
 * Load tools from configured MCP servers
 *
 * This is the main entry point for integrating MCP tools with the agent.
 * It handles initialization, caching, error handling, and graceful degradation.
 *
 * @param options - Options for loading tools
 * @returns Promise resolving to array of LangChain-compatible tools
 *
 * @example
 * ```typescript
 * // Load all tools from all configured servers
 * const tools = await loadMcpTools();
 *
 * // Load tools from specific server
 * const langchainTools = await loadMcpTools({ servers: "langchain-docs" });
 *
 * // Force refresh and reconnect
 * const freshTools = await loadMcpTools({ refresh: true });
 * ```
 */
export async function loadMcpTools(
  options: LoadMcpToolsOptions = {}
): Promise<LoadedTool[]> {
  const serverSelection = normalizeServerSelection(options.servers);
  const shouldRefresh = options.refresh ?? false;

  // Initialize MCP client if not already initialized
  if (!(mcpClientInstance || shouldRefresh)) {
    await initializeMcpClient();
  }

  if (!mcpClientInstance) {
    return [];
  }

  // Get all configured server names
  const serversConfig = loadMcpServersConfig();
  const allServerNames = Object.keys(serversConfig);
  const targetServers = serverSelection ?? allServerNames;

  if (targetServers.length === 0) {
    return [];
  }

  // Return cached tools if available and refresh not requested
  if (shouldRefresh) {
    // Clear cache when refreshing
    cachedTools = null;
  } else {
    if (!serverSelection && cachedTools) {
      return cachedTools;
    }
    if (serverSelection?.every((s) => cachedToolsByServer[s])) {
      return serverSelection.flatMap((s) => cachedToolsByServer[s] ?? []);
    }
  }

  // Fetch tools from servers that aren't cached or need refresh
  const serversToFetch = targetServers.filter(
    (s) => shouldRefresh || !cachedToolsByServer[s]
  );

  await Promise.all(
    serversToFetch.map(async (s) => {
      await fetchToolsForServer(s);
    })
  );

  const available = targetServers.flatMap((s) => cachedToolsByServer[s] ?? []);

  // Update global cache
  cachedTools = allServerNames.flatMap((s) => cachedToolsByServer[s] ?? []);

  return serverSelection ? available : cachedTools;
}

/**
 * Close the MCP client and cleanup resources
 *
 * Should be called when shutting down the application.
 */
export async function closeMcpClient(): Promise<void> {
  if (mcpClientInstance) {
    try {
      await mcpClientInstance.close();
    } catch {
      // Silently handle close errors
    } finally {
      mcpClientInstance = null;
      cachedTools = null;
      for (const key of Object.keys(cachedToolsByServer)) {
        delete cachedToolsByServer[key];
      }
      failedServers.clear();
    }
  }
}
