// src/utils/mcp.ts
// Integration layer between the modular MCP client and the agent's tool system

import type { StructuredTool } from "@langchain/core/tools";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import {
  createMultiMCPClient,
  loadMCPServerFromEnv,
  type MCPServerOptions,
} from "../mcp/index.js";
import { MCPConnectionError, withRetry } from "./errors.js";

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

/**
 * Load MCP servers configuration from environment variables
 *
 * Checks for MCP_LANGCHAIN_URL and loads the LangChain docs server if available.
 * Also loads Sequential Thinking, DeepWiki, and GitHub Copilot servers.
 *
 * @returns Map of server names to configuration options
 */
function loadMCPServersConfig(): Record<string, MCPServerOptions> {
  const servers: Record<string, MCPServerOptions> = {};

  // Load LangChain docs server from MCP_LANGCHAIN_URL
  const langchainConfig = loadMCPServerFromEnv("MCP_LANGCHAIN");
  if (langchainConfig) {
    servers["langchain-docs"] = langchainConfig;
    console.log("✅ Loaded LangChain MCP server config from environment");
  } else {
    console.log("ℹ️ MCP_LANGCHAIN_URL not set. LangChain MCP server disabled.");
  }

  // Load Sequential Thinking server (always available)
  servers["sequential-thinking"] = {
    url: "https://remote.mcpservers.org/sequentialthinking/mcp",
    automaticSSEFallback: true,
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      delayMs: 2000,
    },
  };
  console.log("✅ Loaded Sequential Thinking MCP server config");

  // Load DeepWiki server (always available)
  servers["deepwiki"] = {
    url: "https://mcp.deepwiki.com/mcp",
    automaticSSEFallback: true,
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      delayMs: 2000,
    },
  };
  console.log("✅ Loaded DeepWiki MCP server config");

  // Load GitHub Copilot server if GITHUB_PAT is provided
  const githubPat = process.env.GITHUB_PAT;
  if (githubPat) {
    servers["github-copilot"] = {
      url: "https://api.githubcopilot.com/mcp/",
      headers: {
        Authorization: `Bearer ${githubPat}`,
      },
      automaticSSEFallback: true,
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        delayMs: 2000,
      },
    };
    console.log("✅ Loaded GitHub Copilot MCP server config with PAT from environment");
  } else {
    console.log("ℹ️ GITHUB_PAT not set. GitHub Copilot MCP server disabled.");
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
async function initializeMCPClient(): Promise<MultiServerMCPClient | null> {
  if (mcpClientInstance) {
    return mcpClientInstance;
  }

  const serversConfig = loadMCPServersConfig();
  const serverNames = Object.keys(serversConfig);

  if (serverNames.length === 0) {
    console.log("ℹ️ No MCP servers configured. Skipping MCP client initialization.");
    return null;
  }

  try {
    console.log(`🔌 Initializing MCP client with ${serverNames.length} server(s)...`);
    console.log("⏱️  MCP connection timeout set to", MCP_CONNECTION_TIMEOUT_MS, "ms");
    
    // Add overall timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("MCP client initialization timed out")), 15000);
    });
    
    const initPromise = createMultiMCPClient(serversConfig, {
      useStandardContentBlocks: true,
      defaultToolTimeout: MCP_CONNECTION_TIMEOUT_MS,
      throwOnLoadError: false, // Don't throw on individual server failures
      prefixToolNameWithServerName: true, // Prefix to avoid name collisions
    });
    
    const { client, tools } = await Promise.race([initPromise, timeoutPromise]) as any;

    mcpClientInstance = client;
    cachedTools = tools;

    console.log(`✅ MCP client initialized with ${tools.length} total tools`);
    return client;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("❌ Failed to initialize MCP client:", err.message);
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
        const result = await mcpClientInstance!.getTools(server);
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
        "Check if the URL is correct in environment variables",
        "Verify network connectivity to the MCP server",
        "Check server logs for startup errors",
      ],
    });

    console.error(mcpError.message);
    console.error("Troubleshooting steps:", mcpError.context?.troubleshooting);

    return null;
  }
};

/**
 * Options for loading MCP tools
 */
export interface LoadMcpToolsOptions {
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
}

/**
 * Normalize server selection to array format
 */
const normalizeServerSelection = (
  servers: LoadMcpToolsOptions["servers"]
): McpServerName[] | undefined => {
  if (!servers) return undefined;
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
  if (!mcpClientInstance && !shouldRefresh) {
    await initializeMCPClient();
  }

  if (!mcpClientInstance) {
    console.log("ℹ️ No MCP client available. Returning empty tools array.");
    return [];
  }

  // Get all configured server names
  const serversConfig = loadMCPServersConfig();
  const allServerNames = Object.keys(serversConfig);
  const targetServers = serverSelection ?? allServerNames;

  if (targetServers.length === 0) {
    return [];
  }

  // Return cached tools if available and refresh not requested
  if (!shouldRefresh) {
    if (!serverSelection && cachedTools) {
      return cachedTools;
    }
    if (serverSelection?.every((s) => cachedToolsByServer[s])) {
      return serverSelection.flatMap((s) => cachedToolsByServer[s] ?? []);
    }
  } else {
    // Clear cache when refreshing
    cachedTools = null;
  }

  // Fetch tools from servers that aren't cached or need refresh
  const serversToFetch = targetServers.filter(
    (s) => shouldRefresh || !cachedToolsByServer[s]
  );

  const results = await Promise.all(
    serversToFetch.map(async (s) => ({
      server: s,
      tools: await fetchToolsForServer(s),
    }))
  );

  const failed = results.filter((r) => r.tools === null).map((r) => r.server);

  if (failed.length > 0 && failed.length < targetServers.length) {
    console.warn(
      `Some MCP servers failed to load tools: ${failed.join(", ")}. Returning available tools.`
    );
  }

  const available = targetServers.flatMap((s) => cachedToolsByServer[s] ?? []);

  if (failed.length === targetServers.length && available.length === 0) {
    console.warn(
      `All MCP servers failed to load: ${failed.join(", ")}. Agent will run without MCP tools.`
    );
  }

  // Update global cache
  cachedTools = allServerNames.flatMap((s) => cachedToolsByServer[s] ?? []);

  return serverSelection ? available : cachedTools;
}

/**
 * Close the MCP client and cleanup resources
 *
 * Should be called when shutting down the application.
 */
export async function closeMCPClient(): Promise<void> {
  if (mcpClientInstance) {
    try {
      await mcpClientInstance.close();
      console.log("✅ MCP client closed successfully");
    } catch (error) {
      console.error(
        "⚠️ Error closing MCP client:",
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      mcpClientInstance = null;
      cachedTools = null;
      Object.keys(cachedToolsByServer).forEach(
        (key) => delete cachedToolsByServer[key]
      );
      failedServers.clear();
    }
  }
}
