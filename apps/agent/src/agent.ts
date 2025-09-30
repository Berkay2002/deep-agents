import { Buffer } from "node:buffer";

import { createDeepAgent } from "deepagents";
import { coerceMessageLikeToMessage, type BaseMessageLike } from "@langchain/core/messages";

import { loadDefaultTools } from "./utils/tools.js";
import { createAgentModel } from "./utils/model.js";
import { RESEARCH_AGENT_INSTRUCTIONS, subAgents } from "./utils/nodes.js";
import type { AgentFile, AgentRunInput } from "./utils/state.js";

export type DeepAgentGraph = Awaited<ReturnType<typeof createDeepAgent>>;

const model = createAgentModel();

let deepAgentGraphPromise: Promise<DeepAgentGraph> | null = null;

export async function initDeepAgent(): Promise<DeepAgentGraph> {
  if (!deepAgentGraphPromise) {
    deepAgentGraphPromise = (async () => {
      const tools = await loadDefaultTools();

      return createDeepAgent({
        model,
        tools,
        instructions:
          process.env.DEEP_AGENT_INSTRUCTIONS ?? RESEARCH_AGENT_INSTRUCTIONS,
        subagents: subAgents,
      }).withConfig({ recursionLimit: 1000 });
    })();
  }

  return deepAgentGraphPromise;
}

export async function getDeepAgentGraph(): Promise<DeepAgentGraph> {
  return initDeepAgent();
}

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

export async function invokeDeepAgent(input: AgentRunInput) {
  const agent = await initDeepAgent();
  const files = input.files?.length
    ? Object.fromEntries(
        input.files
          .filter((file: AgentFile) => file.name)
          .map((file: AgentFile) => [file.name, normalizeFileContent(file)])
      )
    : undefined;

  return agent.invoke({
    messages: input.messages.map((message: BaseMessageLike) =>
      coerceMessageLikeToMessage(message)
    ),
    files,
  });
}

/**
 * Custom function that streams agent responses with real-time progress updates
 * Yields events for tool calls, sub-agent invocations, and final answers
 */
export async function* streamDeepAgent(input: AgentRunInput) {
  const agent = await initDeepAgent();
  const files = input.files?.length
    ? Object.fromEntries(
        input.files
          .filter((file: AgentFile) => file.name)
          .map((file: AgentFile) => [file.name, normalizeFileContent(file)])
      )
    : undefined;

  const stream = await agent.stream({
    messages: input.messages.map((message: BaseMessageLike) =>
      coerceMessageLikeToMessage(message)
    ),
    files,
  });

  // Stream events with progress information
  for await (const event of stream) {
    // LangGraph returns events in the format { [nodeName]: data }
    const entries = Object.entries(event);
    if (entries.length === 0) continue;

    // TypeScript-safe extraction of first entry
    const firstEntry = entries[0];
    if (!firstEntry) continue;

    const nodeName = firstEntry[0];
    const data = firstEntry[1];

    // Emit structured event for client consumption
    yield {
      type: "progress",
      nodeName,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}

export type { AgentRunInput } from "./utils/state.js";

// Export for LangGraph Server consumption (required by langgraph.json)
export const deepAgentGraph = await initDeepAgent();
