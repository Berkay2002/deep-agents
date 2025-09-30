// Agent registry and factory
import { deepResearchAgentFactory } from "./deep-research/agent.js";
import { codeAssistantAgentFactory } from "./code-assistant/agent.js";
import type { AgentType, AgentFactory } from "../shared/types.js";

/**
 * Registry of all available agents
 */
export const agentRegistry: Record<AgentType, AgentFactory> = {
  "deep-research": deepResearchAgentFactory,
  "code-assistant": codeAssistantAgentFactory,
  // TODO: Add general-chat agent when implemented
  "general-chat": deepResearchAgentFactory, // Fallback for now
};

/**
 * Create an agent instance by type
 * @param type Agent type to create
 * @param config Optional configuration overrides
 * @returns Agent instance
 */
export async function createAgent(type: AgentType, config = {}) {
  const factory = agentRegistry[type];
  if (!factory) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  return factory.create(config);
}

/**
 * List all available agents with their configurations
 * @returns Array of agent configurations
 */
export function listAvailableAgents() {
  return Object.entries(agentRegistry).map(([type, factory]) => ({
    type: type as AgentType,
    ...factory.getConfig(),
  }));
}

/**
 * Get configuration for a specific agent type
 * @param type Agent type
 * @returns Agent configuration
 */
export function getAgentConfig(type: AgentType) {
  const factory = agentRegistry[type];
  if (!factory) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  return factory.getConfig();
}

/**
 * Check if an agent type is available
 * @param type Agent type to check
 * @returns True if agent type is available
 */
export function isAgentAvailable(type: string): type is AgentType {
  return type in agentRegistry;
}
