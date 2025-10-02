// Shared types for all agents
import type { BaseMessage } from "@langchain/core/messages";
import type { SubAgent } from "../deep-agent/types.js";

// Agent configuration type
export type AgentConfig = {
  name: string;
  description: string;
  capabilities: string[];
  model?: string;
  temperature?: number;
};

// Base state for all agents
export type BaseAgentState = {
  messages: BaseMessage[];
  files?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

// DeepAgent-specific types (importing from deepagents creates circular dependency)
// We'll use 'unknown' for the graph type to avoid issues
export type AgentFactory = {
  create(config?: Partial<AgentConfig>): Promise<unknown>;
  getConfig(): AgentConfig;
};

// Agent type enum
export type AgentType = "deep-research" | "code-assistant" | "general-chat";

// Agent file type
export type AgentFile = {
  name: string;
  data: string | ArrayBuffer | Uint8Array;
  mimeType?: string;
};

// Agent run input
export type AgentRunInput = {
  messages: BaseMessage[];
  files?: AgentFile[];
  preferredAgent?: AgentType;
};

// DeepAgent configuration
export type DeepAgentConfig = {
  tools: unknown[];
  instructions: string;
  subagents?: SubAgent[];
  model?: unknown;
};

// Agent selection result
export type AgentSelectionResult = {
  agent: unknown;
  type: AgentType;
  confidence: number;
  reasoning: string;
};
