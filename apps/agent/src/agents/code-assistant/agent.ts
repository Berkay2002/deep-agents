// Code Assistant Agent - Expert coding assistant for development tasks
import { createDeepAgent } from "../../deep-agent/index.js";
import { createAgentModel } from "../../shared/model.js";
import { loadCodeTools } from "./tools.js";
import { codeSubAgents } from "./nodes.js";
import { CODE_ASSISTANT_INSTRUCTIONS } from "./prompts.js";
import type { AgentFactory, AgentConfig } from "../../shared/types.js";

const defaultConfig: AgentConfig = {
  name: "code-assistant",
  description: "Expert coding assistant for development tasks",
  capabilities: [
    "Code analysis and review",
    "Bug detection and fixing",
    "Architecture and design patterns",
    "Performance optimization",
    "Testing and quality assurance",
    "Documentation generation",
    "Code generation and scaffolding",
    "Best practices guidance"
  ],
  temperature: 0.0 // Lower temperature for more consistent code generation
};

export const codeAssistantAgentFactory: AgentFactory = {
  async create(config = {}) {
    const mergedConfig = { ...defaultConfig, ...config };
    const model = createAgentModel(mergedConfig.temperature);
    const tools = await loadCodeTools();

    return createDeepAgent({
      model,
      tools,
      instructions: CODE_ASSISTANT_INSTRUCTIONS,
      subagents: codeSubAgents,
    }).withConfig({ recursionLimit: 500 }); // Lower recursion limit for code tasks
  },

  getConfig() {
    return defaultConfig;
  }
};

/**
 * Creates a code assistant agent instance
 * @param config Optional configuration overrides
 * @returns DeepAgent configured for coding tasks
 */
export async function createCodeAssistantAgent(config = {}) {
  return codeAssistantAgentFactory.create(config);
}

// Default export for compatibility
export default codeAssistantAgentFactory;
