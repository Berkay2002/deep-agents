// src/mcp/index.ts
// Clean exports for the MCP client module

// Type exports
export type {
  MCPServerOptions,
  MCPClientConfig,
  SingleMCPClientResult,
  MultiMCPClientResult,
} from "./types.js";

// Client function exports
export {
  createSingleMCPClient,
  createMultiMCPClient,
  closeMCPClient,
  createMCPClientWithRetry,
} from "./client.js";

// Configuration exports
export {
  MCP_SERVERS,
  loadMCPServerFromEnv,
  loadAllMCPServersFromEnv,
} from "./config.js";
