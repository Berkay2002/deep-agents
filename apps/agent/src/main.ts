// Main entry point for multi-agent system
import { Buffer } from "node:buffer";
import { coerceMessageLikeToMessage, type BaseMessageLike } from "@langchain/core/messages";
import { createDeepResearchAgent } from "./agents/deep-research/agent.js";
import { createCodeAssistantAgent } from "./agents/code-assistant/agent.js";
import { createAgent, listAvailableAgents } from "./agents/index.js";
import { selectAgent } from "./router.js";
import type { AgentRunInput, AgentType, AgentFile } from "./shared/types.js";

// TODO: Add agent instance caching for better performance
// TODO: Implement agent health monitoring and failover
// TODO: Add comprehensive logging and analytics
// TODO: Support for streaming responses
// TODO: Add rate limiting and usage quotas per agent
// TODO: Implement agent load balancing for high traffic

// Export individual agents for LangGraph configuration
export const deepResearchAgent = await createDeepResearchAgent();
export const codeAssistantAgent = await createCodeAssistantAgent();

// Keep the original deepAgentGraph export for backward compatibility
export const deepAgentGraph = deepResearchAgent;

/**
 * Normalize file content for agent processing
 * @param file Agent file to normalize
 * @returns Normalized file content string
 */
function normalizeFileContent(file: AgentFile): string {
  if (typeof file.data === "string") {
    return file.data;
  }

  const buffer = file.data instanceof Uint8Array
    ? Buffer.from(file.data)
    : Buffer.from(new Uint8Array(file.data));

  const mimeType = file.mimeType ?? "application/octet-stream";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

/**
 * Router agent that automatically selects the best agent for the task
 * @param input Agent run input
 * @returns Agent response
 */
export async function routerAgent(input: AgentRunInput) {
  const messages = input.messages.map((message: BaseMessageLike) =>
    coerceMessageLikeToMessage(message)
  );
  
  // TODO: Add request/response logging for analytics
  // TODO: Add execution time tracking
  // TODO: Add error handling with fallback agents
  
  const selection = await selectAgent(messages, input.preferredAgent);
  
  console.log(`🤖 Selected agent: ${selection.type}`);
  console.log(`📊 Confidence: ${(selection.confidence * 100).toFixed(1)}%`);
  console.log(`💭 Reasoning: ${selection.reasoning}`);
  
  const files = input.files?.length
    ? Object.fromEntries(
        input.files
          .filter((file: AgentFile) => file.name)
          .map((file: AgentFile) => [file.name, normalizeFileContent(file)])
      )
    : undefined;

  // TODO: Add response time monitoring
  // const startTime = Date.now();
  
  const response = await selection.agent.invoke({
    messages,
    files,
  });
  
  // TODO: Log completion metrics
  // const endTime = Date.now();
  // logAgentMetrics(selection.type, { responseTime: endTime - startTime, success: true });
  
  return response;
}

/**
 * Invoke a specific agent directly
 * @param agentType Type of agent to invoke
 * @param input Agent run input
 * @returns Agent response
 */
export async function invokeSpecificAgent(agentType: AgentType, input: AgentRunInput) {
  // TODO: Add agent-specific caching
  // TODO: Add agent warm-up for cold starts
  
  const agent = await createAgent(agentType);
  
  const messages = input.messages.map((message: BaseMessageLike) =>
    coerceMessageLikeToMessage(message)
  );
  
  const files = input.files?.length
    ? Object.fromEntries(
        input.files
          .filter((file: AgentFile) => file.name)
          .map((file: AgentFile) => [file.name, normalizeFileContent(file)])
      )
    : undefined;

  return agent.invoke({
    messages,
    files,
  });
}

/**
 * Main invoke function with backward compatibility
 * @param input Agent run input
 * @returns Agent response
 */
export async function invokeDeepAgent(input: AgentRunInput) {
  // If a specific agent is requested, use it
  if (input.preferredAgent) {
    return invokeSpecificAgent(input.preferredAgent, input);
  }
  
  // Default to deep research agent for backward compatibility
  return invokeSpecificAgent("deep-research", input);
}

/**
 * Enhanced invoke function with automatic agent selection
 * @param input Agent run input
 * @returns Agent response
 */
export async function invokeWithAgentSelection(input: AgentRunInput) {
  return routerAgent(input);
}

// TODO: Add streaming response support
// export async function* invokeWithStream(input: AgentRunInput) {
//   const selection = await selectAgent(input.messages, input.preferredAgent);
//   yield* selection.agent.stream({
//     messages: input.messages.map(coerceMessageLikeToMessage),
//     files: normalizeFiles(input.files)
//   });
// }

// TODO: Add batch processing support
// export async function invokeBatch(inputs: AgentRunInput[]) {
//   return Promise.all(inputs.map(input => routerAgent(input)));
// }

// TODO: Add agent collaboration support
// export async function invokeWithCollaboration(input: AgentRunInput, collaborationStrategy = 'sequential') {
//   // Allow multiple agents to work together on complex tasks
//   // Strategies: sequential, parallel, hierarchical, voting
// }

/**
 * Get information about available agents
 * @returns List of available agents with their configurations
 */
export function getAvailableAgents() {
  return listAvailableAgents();
}

// Export types for external use
export type {
  AgentRunInput,
  AgentType,
  AgentConfig,
  AgentSelectionResult,
  AgentFile
} from "./shared/types.js";

// Export utilities
export { createAgent, listAvailableAgents } from "./agents/index.js";
export { selectAgent, analyzeRouting } from "./router.js";
