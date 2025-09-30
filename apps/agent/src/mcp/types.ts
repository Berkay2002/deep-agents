// src/mcp/types.ts
// HTTP-only MCP server configuration types

/**
 * Configuration options for an HTTP MCP server connection
 *
 * Only supports HTTP transport - no stdio or SSE variants
 */
export interface MCPServerOptions {
  /**
   * The URL of the MCP server endpoint
   * @example "https://docs.langchain.com/mcp"
   */
  url: string;

  /**
   * Optional HTTP headers to send with requests
   * Commonly used for authentication
   * @example { "Authorization": "Bearer token123" }
   */
  headers?: Record<string, string>;

  /**
   * Whether to automatically fallback to SSE if HTTP is not supported
   * @default true
   */
  automaticSSEFallback?: boolean;

  /**
   * Reconnection settings for handling connection failures
   */
  reconnect?: {
    /**
     * Whether to enable automatic reconnection
     * @default true
     */
    enabled: boolean;

    /**
     * Maximum number of reconnection attempts
     * @default 5
     */
    maxAttempts?: number;

    /**
     * Delay in milliseconds between reconnection attempts
     * @default 2000
     */
    delayMs?: number;
  };
}

/**
 * Configuration options for the MCP client
 */
export interface MCPClientConfig {
  /**
   * Use LangChain's standard multimodal content blocks for tools
   * @default true
   */
  useStandardContentBlocks?: boolean;

  /**
   * Default timeout in milliseconds for tool execution
   * @default 30000
   */
  defaultToolTimeout?: number;

  /**
   * Whether to throw an error if a tool fails to load
   * @default true
   */
  throwOnLoadError?: boolean;

  /**
   * Whether to prefix tool names with the server name
   * Prevents name collisions when using multiple servers
   * @default false for single server, true for multiple servers
   */
  prefixToolNameWithServerName?: boolean;
}

/**
 * Result of creating a single MCP client connection
 */
export interface SingleMCPClientResult {
  /** The MCP client instance */
  client: any; // MultiServerMCPClient from @langchain/mcp-adapters

  /** Array of LangChain-compatible tools from the server */
  tools: any[]; // DynamicStructuredTool[]

  /** Name of the connected server */
  serverName: string;
}

/**
 * Result of creating a multi-server MCP client connection
 */
export interface MultiMCPClientResult {
  /** The MCP client instance managing all servers */
  client: any; // MultiServerMCPClient from @langchain/mcp-adapters

  /** Flattened array of all tools from all servers */
  tools: any[]; // DynamicStructuredTool[]

  /** Map of server names to tool counts */
  toolsByServer: Record<string, number>;
}
