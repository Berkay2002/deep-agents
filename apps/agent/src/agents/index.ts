// Agent registry and factory
import { deepResearchAgentFactory } from "./deep-research/agent.js";
import { codeAssistantAgentFactory } from "./code-assistant/agent.js";
import type { AgentType, AgentFactory } from "../shared/types.js";

// TODO: Add general-chat agent implementation
// TODO: Add specialized domain agents (data-analyst, creative-writer, etc.)
// TODO: Implement agent capability discovery and matching
// TODO: Add agent performance metrics and selection optimization
// TODO: Support for user-customizable agents

/**
 * Registry of all available agents
 */
export const agentRegistry: Record<AgentType, AgentFactory> = {
  "deep-research": deepResearchAgentFactory,
  "code-assistant": codeAssistantAgentFactory,
  // TODO: Implement general-chat agent
  "general-chat": deepResearchAgentFactory, // Fallback for now
};

// TODO: Add more agent types as they are implemented:
// "data-analyst": dataAnalystAgentFactory,
// "creative-writer": creativeWriterAgentFactory,
// "project-manager": projectManagerAgentFactory,
// "security-auditor": securityAuditorAgentFactory,
// "api-designer": apiDesignerAgentFactory,
// "devops-engineer": devopsEngineerAgentFactory,

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
  
  // TODO: Add agent instance caching for performance
  // TODO: Add agent health checks and failover
  // TODO: Add agent usage tracking and analytics
  
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

// TODO: Add agent capability matching
// export function findAgentsByCapability(capability: string): AgentType[] {
//   return Object.entries(agentRegistry)
//     .filter(([, factory]) => factory.getConfig().capabilities.includes(capability))
//     .map(([type]) => type as AgentType);
// }

// TODO: Add agent performance tracking
// export interface AgentMetrics {
//   responseTime: number;
//   successRate: number;
//   userSatisfaction: number;
//   usageCount: number;
// }
// 
// const agentMetrics = new Map<AgentType, AgentMetrics>();
// 
// export function getAgentMetrics(type: AgentType): AgentMetrics | undefined {
//   return agentMetrics.get(type);
// }
// 
// export function updateAgentMetrics(type: AgentType, metrics: Partial<AgentMetrics>) {
//   const current = agentMetrics.get(type) || { responseTime: 0, successRate: 0, userSatisfaction: 0, usageCount: 0 };
//   agentMetrics.set(type, { ...current, ...metrics });
// }
