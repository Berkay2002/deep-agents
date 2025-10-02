// src/mcp/index.ts
// This file intentionally left empty to avoid barrel file anti-pattern.
// Import directly from:
// - ./client.js for client functions
// - ./config.js for configuration
// - ./types.js for types

// Client exports
export {
  createMcpClientWithRetry,
  createMultiMcpClient,
  createSingleMcpClient,
} from "./client.js";
// Configuration exports
export {
  loadAllMcpServersFromEnv,
  loadMcpServerFromEnv,
  mcpServers,
} from "./config.js";
// Type exports
export type {
  McpClientConfig,
  McpServerOptions,
  MultiMcpClientResult,
  SingleMcpClientResult,
} from "./types.js";
