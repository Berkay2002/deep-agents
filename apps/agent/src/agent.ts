import { Buffer } from "node:buffer";

import { createDeepAgent } from "deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { coerceMessageLikeToMessage } from "@langchain/core/messages";

import { DEFAULT_AGENT_INSTRUCTIONS } from "./utils/nodes";
import { loadDefaultTools } from "./utils/tools";
import type { AgentFile, AgentRunInput } from "./utils/state";

export type DeepAgentGraph = Awaited<ReturnType<typeof createDeepAgent>>;

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY,
  model: process.env.GOOGLE_GENAI_MODEL ?? "gemini-2.5-pro",
  temperature: 0.3,
  maxOutputTokens: 2048,
});

let deepAgentGraphPromise: Promise<DeepAgentGraph> | null = null;

export async function initDeepAgent(): Promise<DeepAgentGraph> {
  if (!deepAgentGraphPromise) {
    deepAgentGraphPromise = (async () => {
      const tools = await loadDefaultTools();

      return createDeepAgent({
        model,
        tools,
        instructions:
          process.env.DEEP_AGENT_INSTRUCTIONS ?? DEFAULT_AGENT_INSTRUCTIONS,
      });
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
          .filter((file) => file.name)
          .map((file) => [file.name, normalizeFileContent(file)])
      )
    : undefined;

  return agent.invoke({
    messages: input.messages.map((message) =>
      coerceMessageLikeToMessage(message)
    ),
    files,
  });
}

export type { AgentRunInput } from "./utils/state";
