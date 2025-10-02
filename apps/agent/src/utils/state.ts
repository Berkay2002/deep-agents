// src/utils/state.ts
import type { BaseMessageLike } from "@langchain/core/messages";

export type AgentMessage = BaseMessageLike;

export type AgentFile = {
  name: string;
  mimeType?: string;
  data: Uint8Array | ArrayBuffer | string;
};

export type AgentRunInput = {
  messages: AgentMessage[];
  files?: AgentFile[];
};
