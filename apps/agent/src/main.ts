// Main entry point for multi-agent system
import { Buffer } from "node:buffer";
import {
  type BaseMessageLike,
  coerceMessageLikeToMessage,
} from "@langchain/core/messages";
import type { Runnable } from "@langchain/core/runnables";
import { createDeepResearchAgent } from "./agents/deep-research/agent.js";
// Temporarily disabled: Code assistant and router
// import { createCodeAssistantAgent } from "./agents/code-assistant/agent.js";
// import { createAgent, listAvailableAgents } from "./agents/index.js";
// import { selectAgent } from "./router.js";
import type { AgentFile, AgentRunInput } from "./shared/types.js";

// TODO: Add agent instance caching for better performance
// TODO: Implement agent health monitoring and failover
// TODO: Add comprehensive logging and analytics
// TODO: Support for streaming responses
// TODO: Add rate limiting and usage quotas per agent
// TODO: Implement agent load balancing for high traffic

// Define a more flexible type for the agent to handle different return types
type AgentRunnable = Runnable<Record<string, unknown>, unknown>;

// Export individual agents for LangGraph configuration
// Use lazy initialization to prevent blocking server startup
let _deepResearchAgent: AgentRunnable | null = null;
let _agentInitPromise: Promise<AgentRunnable> | null = null;

async function initializeDeepResearchAgent(): Promise<AgentRunnable> {
  try {
    // Initializing deep research agent...
    const agent = await createDeepResearchAgent();
    // Deep research agent initialized successfully
    return agent as unknown as AgentRunnable;
  } catch {
    // Failed to initialize deep research agent, continuing without MCP tools...
    // Return a basic agent without MCP tools
    return await createBasicAgent();
  }
}

async function createBasicAgent(): Promise<AgentRunnable> {
  // Import here to avoid circular dependencies
  const { createDeepAgent } = await import("./deep-agent/agent.js");
  const { createAgentModel } = await import("./shared/model.js");
  const { RESEARCH_AGENT_INSTRUCTIONS } = await import(
    "./agents/deep-research/prompts.js"
  );

  const LowTemperature = 0.1; // Low temperature for consistent responses
  const model = createAgentModel(LowTemperature);

  // Create agent with minimal tools (no MCP tools)
  return createDeepAgent({
    model,
    tools: [], // No MCP tools
    instructions: RESEARCH_AGENT_INSTRUCTIONS,
    subagents: [], // No subagents for now
  }).withConfig({ recursionLimit: 1000 }) as unknown as AgentRunnable;
}

// Export a function that returns the agent (lazy initialization)
export async function getDeepResearchAgent(): Promise<AgentRunnable> {
  if (!_deepResearchAgent) {
    if (!_agentInitPromise) {
      _agentInitPromise = initializeDeepResearchAgent();
    }
    _deepResearchAgent = await _agentInitPromise;
  }
  return _deepResearchAgent;
}

// Export the agent promise for LangGraph (it will handle the await)
export const deepResearchAgent = initializeDeepResearchAgent();
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

  const buffer =
    file.data instanceof Uint8Array
      ? Buffer.from(file.data)
      : Buffer.from(new Uint8Array(file.data));

  const mimeType = file.mimeType || "application/octet-stream";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

/**
 * Router agent that automatically selects the best agent for the task
 * TEMPORARILY DISABLED - using deep research agent only
 * @param input Agent run input
 * @returns Agent response
 */
/*
export async function routerAgent(input: AgentRunInput) {
  const messages = input.messages.map((message: BaseMessageLike) =>
    coerceMessageLikeToMessage(message)
  );

  // TODO: Add request/response logging for analytics
  // TODO: Add execution time tracking
  // TODO: Add error handling with fallback agents

  const selection = await selectAgent(messages, input.preferredAgent);

  // Selected agent: ${selection.type}
  // Confidence: ${(selection.confidence * 100).toFixed(1)}%
  // Reasoning: ${selection.reasoning}

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
*/

/**
 * Invoke a specific agent directly
 * TEMPORARILY DISABLED - using deep research agent only
 * @param agentType Type of agent to invoke
 * @param input Agent run input
 * @returns Agent response
 */
/*
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
*/

/**
 * Main invoke function with backward compatibility
 * @param input Agent run input
 * @returns Agent response
 */
export async function invokeDeepAgent(input: AgentRunInput) {
  // Simplified: Always use deep research agent
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

  const agent = await createDeepResearchAgent();
  return (agent as AgentRunnable).invoke({
    messages,
    files,
  });
}

/**
 * Enhanced invoke function with automatic agent selection
 * TEMPORARILY DISABLED - using deep research agent only
 * @param input Agent run input
 * @returns Agent response
 */
export function invokeWithAgentSelection(input: AgentRunInput) {
  // Temporarily use deep research agent only
  return invokeDeepAgent(input);
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
 * TEMPORARILY DISABLED - returning only deep research agent
 * @returns List of available agents with their configurations
 */
export function getAvailableAgents() {
  return [
    {
      type: "deep-research" as const,
      name: "Deep Research Agent",
      description: "Research-focused agent for comprehensive analysis",
    },
  ];
}

// Export types for external use
export type {
  AgentFile,
  AgentRunInput,
  AgentType,
} from "./shared/types.js";

// Temporarily disabled exports
// export { createAgent, listAvailableAgents } from "./agents/index.js";
// export { selectAgent, analyzeRouting } from "./router.js";
