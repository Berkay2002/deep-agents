// Deep Research Agent - Expert researcher for in-depth analysis and report generation
import { createDeepAgent } from "../../deep-agent/agent.js";
import { createAgentModel } from "../../shared/model.js";
import type { AgentConfig, AgentFactory } from "../../shared/types.js";
import { researchSubAgents } from "./nodes.js";
import { RESEARCH_AGENT_INSTRUCTIONS } from "./prompts.js";
import { loadResearchTools } from "./tools.js";

const defaultConfig: AgentConfig = {
  name: "deep-research",
  description: "Expert researcher for in-depth analysis and report generation",
  capabilities: [
    "Web research and analysis",
    "Report writing and synthesis",
    "Academic research methodology",
    "Multi-source information gathering",
    "Citation and source management",
    "Comparative analysis",
    "Topic exploration and breakdown",
  ],
  temperature: 0.1,
};

export const deepResearchAgentFactory: AgentFactory = {
  async create(config = {}) {
    const mergedConfig = { ...defaultConfig, ...config };
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
    return defaultConfig;
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
