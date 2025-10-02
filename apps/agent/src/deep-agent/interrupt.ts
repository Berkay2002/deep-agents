import { AIMessage, isAIMessage, ToolMessage } from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import { interrupt } from "@langchain/langgraph";
import type {
  ActionRequest,
  HumanInterrupt,
  HumanInterruptConfig,
  HumanResponse,
} from "@langchain/langgraph/prebuilt";
import type { DeepAgentStateType, ToolInterruptConfig } from "./types.js";

function validateToolConfigs(toolConfigs: ToolInterruptConfig): void {
  for (const [tool, interruptConfig] of Object.entries(toolConfigs)) {
    if (
      interruptConfig &&
      typeof interruptConfig === "object" &&
      interruptConfig.allow_ignore
    ) {
      throw new Error(
        `For ${tool} we get allow_ignore = true - we currently don't support ignore.`
      );
    }
  }
}

function getLastMessageWithToolCalls(messages: unknown[]): AIMessage | null {
  if (!messages.length) {
    return null;
  }

  const lastMessage = messages.at(-1);
  if (
    !(
      lastMessage &&
      isAIMessage(lastMessage as AIMessage) &&
      (lastMessage as AIMessage).tool_calls &&
      (lastMessage as AIMessage).tool_calls?.length
    )
  ) {
    return null;
  }

  return lastMessage as AIMessage;
}

function categorizeToolCalls(
  toolCalls: ToolCall[],
  toolConfigs: ToolInterruptConfig
): { interruptToolCalls: ToolCall[]; autoApprovedToolCalls: ToolCall[] } {
  const interruptToolCalls: ToolCall[] = [];
  const autoApprovedToolCalls: ToolCall[] = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.name;
    if (toolName in toolConfigs) {
      interruptToolCalls.push(toolCall);
    } else {
      autoApprovedToolCalls.push(toolCall);
    }
  }

  return { interruptToolCalls, autoApprovedToolCalls };
}

// biome-ignore lint/suspicious/useAwait: <Fine>
async function handleInterruptResponse(
  response: HumanResponse,
  toolCall: ToolCall,
  lastMessage: AIMessage,
  approvedToolCalls: ToolCall[]
): Promise<Partial<DeepAgentStateType> | undefined> {
  if (response.type === "accept") {
    approvedToolCalls.push(toolCall);
  } else if (response.type === "edit") {
    const edited = response.args as ActionRequest;
    if (!(edited?.action && edited?.args)) {
      throw new Error("Invalid edited action request");
    }
    const newToolCall = {
      name: edited.action,
      args: edited.args,
      id: toolCall.id,
    };
    approvedToolCalls.push(newToolCall);
  } else if (response.type === "response") {
    if (!toolCall.id) {
      throw new Error("Tool call must have an ID for response type");
    }
    const responseContent = response.args as string;
    if (typeof responseContent !== "string") {
      throw new Error("Response content must be a string");
    }
    const responseMessage = new ToolMessage({
      // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
      tool_call_id: toolCall.id,
      content: responseContent,
    });
    return { messages: [responseMessage] };
  } else {
    throw new Error(`Unknown response type: ${response.type}`);
  }

  const updatedLastMessage = new AIMessage({
    ...lastMessage,
    // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
    tool_calls: approvedToolCalls,
  });

  return { messages: [updatedLastMessage] };
}

function createInterruptRequest(
  toolName: string,
  toolArgs: Record<string, unknown>,
  description: string,
  toolConfig: HumanInterruptConfig | boolean
): HumanInterrupt {
  const defaultToolConfig: HumanInterruptConfig = {
    // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
    allow_accept: true,
    // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
    allow_edit: true,
    // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
    allow_respond: true,
    // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
    allow_ignore: false,
  };

  return {
    // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
    action_request: {
      action: toolName,
      args: toolArgs,
    },
    config: typeof toolConfig === "object" ? toolConfig : defaultToolConfig,
    description,
  };
}

async function processSingleInterrupt(
  toolCall: ToolCall,
  messagePrefix: string,
  toolConfigs: ToolInterruptConfig
): Promise<HumanResponse> {
  if (!toolCall) {
    throw new Error("Tool call is undefined");
  }

  const toolName = toolCall.name;
  const toolArgs = toolCall.args;
  const description = `${messagePrefix}\n\nTool: ${toolName}\nArgs: ${JSON.stringify(toolArgs, null, 2)}`;
  const toolConfig = toolConfigs[toolName];

  const request = createInterruptRequest(
    toolName,
    toolArgs,
    description,
    toolConfig ?? false
  );

  const res: HumanResponse | HumanResponse[] = await interrupt([request]);
  const responses = Array.isArray(res) ? res : [res];
  if (responses.length !== 1) {
    throw new Error(`Expected a list of one response, got ${responses.length}`);
  }

  const response = responses[0];
  if (!response) {
    throw new Error("Response is undefined");
  }

  return response;
}

export function createInterruptHook(
  toolConfigs: ToolInterruptConfig,
  messagePrefix = "Tool execution requires approval"
): (
  state: DeepAgentStateType
) => Promise<Partial<DeepAgentStateType> | undefined> {
  /**
   * Create a post model hook that handles interrupts using native LangGraph schemas.
   *
   * Args:
   *   toolConfigs: Record mapping tool names to HumanInterruptConfig objects
   *   messagePrefix: Optional message prefix for interrupt descriptions
   */
  validateToolConfigs(toolConfigs);

  return async function interruptHook(
    // biome-ignore lint/suspicious/noExplicitAny: Required by LangGraph API
    state: any
  ): Promise<Partial<DeepAgentStateType> | undefined> {
    const messages = state.messages || [];
    const lastMessage = getLastMessageWithToolCalls(messages);
    if (!lastMessage) {
      return;
    }

    const { interruptToolCalls, autoApprovedToolCalls } = categorizeToolCalls(
      lastMessage.tool_calls || [],
      toolConfigs
    );

    if (!interruptToolCalls.length) {
      return;
    }

    const approvedToolCalls = [...autoApprovedToolCalls];

    if (interruptToolCalls.length > 1) {
      throw new Error(
        "Right now, interrupt hook only works when one tool requires interrupts"
      );
    }

    const toolCall = interruptToolCalls[0];
    if (!toolCall) {
      throw new Error("Tool call is undefined");
    }

    const response = await processSingleInterrupt(
      toolCall,
      messagePrefix,
      toolConfigs
    );

    return handleInterruptResponse(
      response,
      toolCall,
      lastMessage,
      approvedToolCalls
    );
  };
}
