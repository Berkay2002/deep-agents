// Deep Research Agent - Expert researcher for in-depth analysis and report generation
import { createDeepAgent } from "../../deep-agent-experimental/agent.js";
import { createAgentModel } from "../../shared/model.js";
import type { AgentFactory } from "../../shared/types.js";
import {
  defaultDeepResearchConfig,
  researchSubAgents,
} from "./config/index.js";
import { RESEARCH_AGENT_INSTRUCTIONS } from "./prompts/index.js";
import { loadResearchTools } from "./tools.js";

export const deepResearchAgentFactory: AgentFactory = {
  async create(config = {}) {
    const mergedConfig = { ...defaultDeepResearchConfig, ...config };
    const model = createAgentModel(mergedConfig.temperature);
    const tools = await loadResearchTools();

    return createDeepAgent({
      model,
      tools,
      instructions: RESEARCH_AGENT_INSTRUCTIONS,
      subagents: researchSubAgents,
    }).withConfig({ recursionLimit: 1000 });
  },

  getConfig() {
    return defaultDeepResearchConfig;
  },
};

/**
 * Creates a deep research agent instance
 * @param config Optional configuration overrides
 * @returns DeepAgent configured for research tasks
 */
export function createDeepResearchAgent(config = {}) {
  return deepResearchAgentFactory.create(config);
}

// Default export for compatibility
export default deepResearchAgentFactory;
