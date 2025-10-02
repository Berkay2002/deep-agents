// src/mcp/client.ts
/** biome-ignore-all lint/suspicious/noConsole: <> */
// Core MCP client creation and management functions (HTTP transport only)

import type {
  Connection,
  StreamableHTTPConnection,
} from "@langchain/mcp-adapters";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type {
  McpClientConfig,
  McpServerOptions,
  MultiMcpClientResult,
  SingleMcpClientResult,
} from "./types.js";

// Constants for magic numbers
const BASE_RETRY_DELAY_MS = 1000;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_DELAY_MS = 2000;

/**
 * Create a single MCP server connection
 *
 * This is a convenience wrapper around MultiServerMCPClient for connecting
 * to a single MCP server via HTTP transport.
 *
 * @param serverName - Unique identifier for the server
 * @param options - HTTP connection options
 * @param clientConfig - Optional client configuration
 * @returns Promise resolving to client, tools, and server name
 *
 * @example
 * ```typescript
 * const { client, tools } = await createSingleMcpClient(
 *   "langchain-docs",
 *   { url: "https://docs.langchain.com/mcp" }
 * );
 * ```
 */
export async function createSingleMcpClient(
  serverName: string,
  options: McpServerOptions,
  clientConfig: McpClientConfig = {}
): Promise<SingleMcpClientResult> {
  const {
    useStandardContentBlocks = true,
    defaultToolTimeout = 30_000,
    throwOnLoadError = true,
    prefixToolNameWithServerName = false,
  } = clientConfig;

  const mcpClient = new MultiServerMCPClient({
    useStandardContentBlocks,
    defaultToolTimeout,
    throwOnLoadError,
    prefixToolNameWithServerName,
    mcpServers: {
      [serverName]: buildServerConfig(options),
    },
  });

  try {
    const tools = await mcpClient.getTools();
    // eslint-disable-next-line no-console
    console.log(
      `✅ Connected to '${serverName}': ${tools.length} tools loaded`
    );

    return {
      client: mcpClient,
      tools,
      serverName,
    };
  } catch (error) {
    await mcpClient.close();
    throw new Error(
      `Failed to connect to MCP server '${serverName}': ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Create multiple MCP server connections
 *
 * Connects to multiple MCP servers simultaneously and returns all tools.
 * Tool names are prefixed with server names by default to avoid collisions.
 *
 * @param servers - Map of server names to connection options
 * @param clientConfig - Optional client configuration
 * @returns Promise resolving to client, tools, and tools grouped by server
 *
 * @example
 * ```typescript
 * const { client, tools, toolsByServer } = await createMultiMcpClient({
 *   "langchain-docs": { url: "https://docs.langchain.com/mcp" },
 *   "custom-api": {
 *     url: "https://api.example.com/mcp",
 *     headers: { "Authorization": "Bearer token" }
 *   }
 * });
 * ```
 */
export async function createMultiMcpClient(
  servers: Record<string, McpServerOptions>,
  clientConfig: McpClientConfig = {}
): Promise<MultiMcpClientResult> {
  const {
    useStandardContentBlocks = true,
    defaultToolTimeout = 30_000,
    prefixToolNameWithServerName = true,
  } = clientConfig;

  // Try to connect to each server individually to identify failures
  const successfulServers: Record<string, Connection> = {};
  const failedServers: string[] = [];

  // Use Promise.all with map instead of for...of for better async handling
  await Promise.all(
    Object.entries(servers).map(async ([name, options]) => {
      try {
        // Test connection by creating a single-server client
        const testClient = new MultiServerMCPClient({
          useStandardContentBlocks,
          defaultToolTimeout,
          throwOnLoadError: true, // Throw on individual test to catch failures
          prefixToolNameWithServerName: false,
          mcpServers: {
            [name]: buildServerConfig(options),
          },
        });

        await testClient.getTools(); // Test if server is accessible
        await testClient.close();

        // Server works, add to successful list
        successfulServers[name] = buildServerConfig(options);
        // eslint-disable-next-line no-console
        console.log(`✅ Pre-validated MCP server: ${name}`);
      } catch (error) {
        failedServers.push(name);
        // eslint-disable-next-line no-console
        console.warn(
          `⚠️  MCP server '${name}' failed to connect: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    })
  );

  // If no servers succeeded, return empty result
  if (Object.keys(successfulServers).length === 0) {
    // eslint-disable-next-line no-console
    console.error("❌ All MCP servers failed to connect");
    // Create a dummy client that won't be used
    const dummyClient = new MultiServerMCPClient({
      useStandardContentBlocks,
      defaultToolTimeout,
      throwOnLoadError: false,
      prefixToolNameWithServerName,
      mcpServers: {},
    });

    return {
      client: dummyClient,
      tools: [],
      toolsByServer: {},
    };
  }

  // Create client with only successful servers
  const mcpClient = new MultiServerMCPClient({
    useStandardContentBlocks,
    defaultToolTimeout,
    throwOnLoadError: false,
    prefixToolNameWithServerName,
    mcpServers: successfulServers,
  });

  try {
    const tools = await mcpClient.getTools();

    // Group tools by server (assumes tool names are prefixed with server names)
    const toolsByServer: Record<string, number> = {};
    for (const tool of tools) {
      // Extract server name from tool name (format: "servername__toolname")
      const parts = tool.name.split("__");
      const serverPrefix = parts.length > 1 ? parts[0] || "unknown" : "unknown";
      const currentCount = toolsByServer[serverPrefix] ?? 0;
      toolsByServer[serverPrefix] = currentCount + 1;
    }

    const successCount = Object.keys(successfulServers).length;
    const totalCount = Object.keys(servers).length;
    // eslint-disable-next-line no-console
    console.log(
      `✅ Connected to ${successCount}/${totalCount} MCP servers (${failedServers.length} failed):`
    );
    for (const [server, count] of Object.entries(toolsByServer)) {
      // eslint-disable-next-line no-console
      console.log(`   - ${server}: ${count} tools`);
    }

    if (failedServers.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`⚠️  Failed servers: ${failedServers.join(", ")}`);
    }

    return {
      client: mcpClient,
      tools,
      toolsByServer,
    };
  } catch (error) {
    await mcpClient.close();
    throw new Error(
      `Failed to connect to MCP servers: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Build server configuration from options
 *
 * Converts our simplified McpServerOptions to the official
 * StreamableHTTPConnection type from @langchain/mcp-adapters
 *
 * @param options - Simplified server options
 * @returns Official StreamableHTTPConnection configuration
 */
function buildServerConfig(
  options: McpServerOptions
): StreamableHTTPConnection {
  return {
    url: options.url,
    transport: "http" as const,
    headers: options.headers,
    // biome-ignore lint/style/useNamingConvention: Required by MCP adapter API
    automaticSSEFallback: options.automaticSseFallback ?? true,
    reconnect: options.reconnect || {
      enabled: true,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      delayMs: DEFAULT_DELAY_MS,
    },
  };
}

/**
 * Safely close an MCP client with error handling
 *
 * @param client - MultiServerMCPClient instance to close
 *
 * @example
 * ```typescript
 * const { client } = await createSingleMcpClient(...);
 * // ... use client ...
 * await closeMcpClient(client);
 * ```
 */
export async function closeMcpClient(
  client: MultiServerMCPClient
): Promise<void> {
  try {
    await client.close();
    // eslint-disable-next-line no-console
    console.log("✅ MCP client closed successfully");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      "⚠️ Error closing MCP client:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Create MCP client with exponential backoff retry logic
 *
 * Useful for handling transient network errors or server startup delays.
 *
 * @param createFn - Function that creates the MCP client
 * @param maxRetries - Maximum number of retry attempts
 * @returns Promise resolving to the client creation result
 *
 * @example
 * ```typescript
 * const { client, tools } = await createMcpClientWithRetry(
 *   () => createSingleMcpClient("langchain-docs", { url: "..." }),
 *   3
 * );
 * ```
 */
export async function createMcpClientWithRetry<T>(
  createFn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await createFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line no-console
      console.error(
        `❌ MCP connection attempt ${attempt}/${maxRetries} failed: ${lastError.message}`
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, ...
        const delayMs = 2 ** (attempt - 1) * BASE_RETRY_DELAY_MS;
        // eslint-disable-next-line no-console
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(
    `Failed to create MCP client after ${maxRetries} attempts: ${lastError?.message}`
  );
}
