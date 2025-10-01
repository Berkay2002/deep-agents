import { Buffer } from "node:buffer";

import { createDeepAgent } from "deepagents";
import { coerceMessageLikeToMessage, type BaseMessageLike } from "@langchain/core/messages";

import { loadDefaultTools } from "./utils/tools.js";
import { createAgentModel } from "./utils/model.js";
import { RESEARCH_AGENT_INSTRUCTIONS, subAgents } from "./utils/nodes.js";
import type { AgentFile, AgentRunInput } from "./utils/state.js";

export type DeepAgentGraph = Awaited<ReturnType<typeof createDeepAgent>>;
export type DeepAgentRunResult = Awaited<ReturnType<DeepAgentGraph["invoke"]>>;

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

export async function invokeDeepAgent(
  input: AgentRunInput
): Promise<DeepAgentRunResult> {
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

export type { AgentRunInput } from "./utils/state.js";

// Export for LangGraph Server consumption (required by langgraph.json)
export const deepAgentGraph: DeepAgentGraph = await initDeepAgent();
