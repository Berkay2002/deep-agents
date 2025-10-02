// src/mcp/config.ts
// Predefined MCP server configurations and environment variable loading

import type { McpServerOptions } from "./types.js";

/**
 * Predefined MCP server configurations
 *
 * These are well-known MCP servers that can be used directly
 * without manual configuration.
 */
export const mcpServers = {
  /**
   * LangChain Documentation MCP Server
   *
   * Provides access to LangChain documentation and examples.
   * Default URL can be overridden via MCP_LANGCHAIN_URL environment variable.
   */
  langchainDocs: {
    url: process.env.MCP_LANGCHAIN_URL || "https://docs.langchain.com/mcp",
    automaticSseFallback: true,
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      delayMs: 2000,
    },
  } satisfies McpServerOptions,

  /**
   * Sequential Thinking MCP Server
   *
   * Provides tools for structured thinking and reasoning.
   */
  sequentialThinking: {
    url: "https://remote.mcpservers.org/sequentialthinking/mcp",
    automaticSseFallback: true,
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      delayMs: 2000,
    },
  } satisfies McpServerOptions,

  /**
   * DeepWiki MCP Server
   *
   * Provides access to wiki-style knowledge and documentation.
   */
  deepwiki: {
    url: "https://mcp.deepwiki.com/mcp",
    automaticSseFallback: true,
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      delayMs: 2000,
    },
  } satisfies McpServerOptions,

  /**
   * GitHub Copilot MCP Server
   *
   * Provides GitHub API access and code-related tools.
   * Requires GitHub PAT for authentication.
   */
  githubCopilot: {
    url: "https://api.githubcopilot.com/mcp/",
    automaticSseFallback: true,
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      delayMs: 2000,
    },
    // Note: Authorization header will be added dynamically at runtime
  } satisfies McpServerOptions,
} as const;

/**
 * Load MCP server configuration from environment variables
 *
 * Searches for environment variables with the specified prefix and
 * constructs an McpServerOptions object.
 *
 * Required environment variables:
 * - `{PREFIX}_URL`: The MCP server endpoint URL
 *
 * Optional environment variables:
 * - `{PREFIX}_API_KEY`: API key for authorization header
 * - `{PREFIX}_MAX_RETRIES`: Maximum reconnection attempts (default: 5)
 * - `{PREFIX}_RETRY_DELAY`: Delay between retries in ms (default: 2000)
 *
 * @param envPrefix - Prefix for environment variables (default: "MCP")
 * @returns Server configuration or null if URL not found
 *
 * @example
 * ```typescript
 * // With env vars: MCP_URL=https://api.example.com/mcp
 * const config = loadMcpServerFromEnv("MCP");
 * // Returns: { url: "https://api.example.com/mcp", ... }
 * ```
 *
 * @example
 * ```typescript
 * // With env vars: CUSTOM_URL=https://custom.com/mcp, CUSTOM_API_KEY=secret
 * const config = loadMcpServerFromEnv("CUSTOM");
 * // Returns: { url: "https://custom.com/mcp", headers: { Authorization: "Bearer secret" }, ... }
 * ```
 */
export function loadMcpServerFromEnv(
  envPrefix = "MCP"
): McpServerOptions | null {
  const url = process.env[`${envPrefix}_URL`];
  if (!url) {
    return null;
  }

  const apiKey = process.env[`${envPrefix}_API_KEY`];
  const maxRetries = Number.parseInt(
    process.env[`${envPrefix}_MAX_RETRIES`] || "5",
    10
  );
  const retryDelay = Number.parseInt(
    process.env[`${envPrefix}_RETRY_DELAY`] || "2000",
    10
  );

  return {
    url,
    headers: apiKey
      ? {
          authorization: `Bearer ${apiKey}`,
        }
      : undefined,
    automaticSseFallback: true,
    reconnect: {
      enabled: true,
      maxAttempts: maxRetries,
      delayMs: retryDelay,
    },
  };
}

/**
 * Load all MCP servers from environment variables with a specific prefix
 *
 * Searches for environment variables matching the pattern:
 * - `{PREFIX}_{SERVER_NAME}_URL`
 * - `{PREFIX}_{SERVER_NAME}_API_KEY` (optional)
 *
 * @param envPrefix - Prefix for environment variables (default: "MCP")
 * @returns Map of server names to configurations
 *
 * @example
 * ```typescript
 * // With env vars:
 * // MCP_DOCS_URL=https://docs.example.com/mcp
 * // MCP_API_URL=https://api.example.com/mcp
 * // MCP_API_API_KEY=secret123
 *
 * const servers = loadAllMcpServersFromEnv("MCP");
 * // Returns: {
 * //   "docs": { url: "https://docs.example.com/mcp", ... },
 * //   "api": { url: "https://api.example.com/mcp", headers: { ... }, ... }
 * // }
 * ```
 */
export function loadAllMcpServersFromEnv(
  envPrefix = "MCP"
): Record<string, McpServerOptions> {
  const servers: Record<string, McpServerOptions> = {};
  const urlPattern = new RegExp(`^${envPrefix}_([A-Z_]+)_URL$`);

  // Find all environment variables matching the URL pattern
  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(urlPattern);
    if (match?.[1] && value) {
      const serverName = match[1].toLowerCase();
      const apiKey = process.env[`${envPrefix}_${match[1]}_API_KEY`];
      const maxRetries = Number.parseInt(
        process.env[`${envPrefix}_${match[1]}_MAX_RETRIES`] || "5",
        10
      );
      const retryDelay = Number.parseInt(
        process.env[`${envPrefix}_${match[1]}_RETRY_DELAY`] || "2000",
        10
      );

      servers[serverName] = {
        url: value,
        headers: apiKey
          ? {
              authorization: `Bearer ${apiKey}`,
            }
          : undefined,
        automaticSseFallback: true,
        reconnect: {
          enabled: true,
          maxAttempts: maxRetries,
          delayMs: retryDelay,
        },
      };
    }
  }

  return servers;
}
