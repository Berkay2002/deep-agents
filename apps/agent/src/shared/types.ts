// Shared types for all agents
import type { BaseMessage } from "@langchain/core/messages";
import type { SubAgent } from "deepagents";

// Agent configuration interface
export interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  model?: string;
  temperature?: number;
}

// Base state for all agents
export interface BaseAgentState {
  messages: BaseMessage[];
  files?: Record<string, string>;
  context?: Record<string, any>;
}

// DeepAgent-specific types (importing from deepagents creates circular dependency)
// We'll use 'any' for the graph type to avoid issues
export interface AgentFactory {
  create(config?: Partial<AgentConfig>): Promise<any>;
  getConfig(): AgentConfig;
}

// Agent type enum
export type AgentType = "deep-research" | "code-assistant" | "general-chat";

// Agent file interface
export interface AgentFile {
  name: string;
  data: string | ArrayBuffer | Uint8Array;
  mimeType?: string;
}

// Agent run input
export interface AgentRunInput {
  messages: BaseMessage[];
  files?: AgentFile[];
  preferredAgent?: AgentType;
}

// DeepAgent configuration
export interface DeepAgentConfig {
  tools: any[];
  instructions: string;
  subagents?: SubAgent[];
  model?: any;
}

// Agent selection result
export interface AgentSelectionResult {
  agent: any;
  type: AgentType;
  confidence: number;
  reasoning: string;
}
